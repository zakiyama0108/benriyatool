import { describe, it, expect, vi } from 'vitest'
import {
  fetchGenreHints,
  buildFixedSourceHealthLogLines,
  type HttpClient,
  type HtmlParsers,
} from '../../../app/research-digest/lib/fetchFixedSourceHints'
import type { FixedSourceEntry } from '../../../app/research-digest/lib/fixedSourceTypes'

function makeHttp(overrides: Partial<HttpClient> = {}): HttpClient {
  return {
    fetchText: vi.fn().mockRejectedValue(new Error('未実装のURL')),
    ...overrides,
  }
}

function rssXml(items: { title: string; link: string; pubDate: string }[]): string {
  const body = items.map((i) => `<item><title>${i.title}</title><link>${i.link}</link><pubDate>${i.pubDate}</pubDate></item>`).join('')
  return `<?xml version="1.0"?><rss><channel>${body}</channel></rss>`
}

const feedEntry: FixedSourceEntry = {
  genreId: 'psychology-brain',
  name: 'Nature Neuroscience',
  channel: { type: 'feed', url: 'https://www.nature.com/neuro.rss' },
}

const htmlEntry: FixedSourceEntry = {
  genreId: 'medical-health',
  name: '日本医師会プレスリリース一覧',
  channel: { type: 'site-specific-html', url: 'https://www.med.or.jp/nichiionline/press/', parserId: 'jmaPress' },
}

// 仕様: specs/research-digest/content-selection/requirements.md#情報源(固定リスト)-1、specs/research-digest/content-selection/design.md「固定情報源からヒントを集める処理」
describe('固定情報源からのヒント取得 - RSS/Atom/RDFは共通パーサー、site-specific-htmlはparserIdに対応する専用パーサーで新着を取得する', () => {
  it('feed形式(RSS)から見出し・URL・公開日時を抽出できること', async () => {
    const xml = rssXml([{ title: '新着論文A', link: 'https://www.nature.com/articles/a', pubDate: 'Mon, 19 Oct 2026 00:00:00 +0000' }])
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(xml) })

    const { hints } = await fetchGenreHints('psychology-brain', [feedEntry], http, {})

    expect(hints).toHaveLength(1)
    expect(hints[0]).toMatchObject({ sourceName: 'Nature Neuroscience', title: '新着論文A', url: 'https://www.nature.com/articles/a' })
    expect(hints[0].publishedAt).not.toBeNull()
  })

  it('<title>と<![CDATA[の間に改行がある整形済みXMLでもタイトルを抽出できること', async () => {
    const xml = `<?xml version="1.0"?><rss><channel><item>
<title>
<![CDATA[
改行を含むCDATAタイトル
]]>
</title>
<link>https://www.nature.com/articles/cdata</link>
<pubDate>Mon, 19 Oct 2026 00:00:00 +0000</pubDate>
</item></channel></rss>`
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(xml) })

    const { hints } = await fetchGenreHints('psychology-brain', [feedEntry], http, {})

    expect(hints).toHaveLength(1)
    expect(hints[0].title).toBe('改行を含むCDATAタイトル')
  })

  it('タイトル・URLに含まれるHTML実体参照をデコードすること', async () => {
    const xml = `<?xml version="1.0"?><rss><channel><item><title>A &amp; B の研究</title><link>https://www.nature.com/articles/b?x=1&amp;y=2</link><pubDate>Mon, 19 Oct 2026 00:00:00 +0000</pubDate></item></channel></rss>`
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(xml) })

    const { hints } = await fetchGenreHints('psychology-brain', [feedEntry], http, {})

    expect(hints).toHaveLength(1)
    expect(hints[0].title).toBe('A & B の研究')
    expect(hints[0].url).toBe('https://www.nature.com/articles/b?x=1&y=2')
  })

  it('Atomの<link>が複数ある場合、rel="self"ではなくrel="alternate"のURLを採用すること', async () => {
    const xml = `<?xml version="1.0"?><feed><entry><title>Atomエントリ</title><link rel="self" href="https://api.example.com/feed/1"/><link rel="alternate" href="https://www.nature.com/articles/atom-1"/><updated>2026-10-19T00:00:00Z</updated></entry></feed>`
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(xml) })

    const { hints } = await fetchGenreHints('psychology-brain', [feedEntry], http, {})

    expect(hints).toHaveLength(1)
    expect(hints[0].url).toBe('https://www.nature.com/articles/atom-1')
  })

  it('site-specific-html形式はparserIdに対応する専用パーサーを呼び出すこと', async () => {
    const html = '<html>ダミー</html>'
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(html) })
    const jmaPress = vi.fn().mockReturnValue([{ title: 'プレスリリースX', url: 'https://www.med.or.jp/a.html', publishedAt: '2026-10-19' }])
    const parsers: HtmlParsers = { jmaPress }

    const { hints } = await fetchGenreHints('medical-health', [htmlEntry], http, parsers)

    expect(jmaPress).toHaveBeenCalledWith(html)
    expect(hints).toEqual([{ sourceName: '日本医師会プレスリリース一覧', title: 'プレスリリースX', url: 'https://www.med.or.jp/a.html', publishedAt: '2026-10-19' }])
  })

  it('parserIdに対応するパーサーが見つからない場合、その情報源だけが取得失敗として扱われること', async () => {
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue('<html></html>') })

    const { hints, stats } = await fetchGenreHints('medical-health', [htmlEntry], http, {})

    expect(hints).toHaveLength(0)
    expect(stats).toEqual([{ sourceName: '日本医師会プレスリリース一覧', ok: false, count: 0 }])
  })

  it('1件の取得失敗が他の情報源の結果に影響しないこと(その情報源だけが結果から除かれる)', async () => {
    const xml = rssXml([{ title: '新着論文B', link: 'https://www.nature.com/articles/b', pubDate: 'Mon, 19 Oct 2026 00:00:00 +0000' }])
    const fetchText = vi.fn().mockImplementation((url: string) => {
      if (url.includes('med.or.jp')) throw new Error('取得失敗')
      return Promise.resolve(xml)
    })
    const http = makeHttp({ fetchText })
    const htmlEntrySameGenre: FixedSourceEntry = { ...htmlEntry, genreId: 'psychology-brain' }

    const { hints, stats } = await fetchGenreHints('psychology-brain', [feedEntry, htmlEntrySameGenre], http, { jmaPress: vi.fn() })

    expect(hints).toHaveLength(1)
    expect(hints[0].sourceName).toBe('Nature Neuroscience')
    expect(stats.find((s) => s.sourceName === '日本医師会プレスリリース一覧')).toEqual({ sourceName: '日本医師会プレスリリース一覧', ok: false, count: 0 })
    expect(stats.find((s) => s.sourceName === 'Nature Neuroscience')).toEqual({ sourceName: 'Nature Neuroscience', ok: true, count: 1 })
  })

  it('対象ジャンルに固定情報源がない場合は空配列を返すこと', async () => {
    const http = makeHttp()
    const { hints, stats } = await fetchGenreHints('sleep-exercise', [feedEntry, htmlEntry], http, {})
    expect(hints).toEqual([])
    expect(stats).toEqual([])
  })

  it('取得件数が情報源あたり10件を超えないこと', async () => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      title: `記事${i}`,
      link: `https://www.nature.com/articles/${i}`,
      pubDate: 'Mon, 19 Oct 2026 00:00:00 +0000',
    }))
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(rssXml(items)) })

    const { hints, stats } = await fetchGenreHints('psychology-brain', [feedEntry], http, {})

    expect(hints).toHaveLength(10)
    expect(stats[0]).toEqual({ sourceName: 'Nature Neuroscience', ok: true, count: 10 })
  })

  it('タイトルが200字を超える場合は切り詰めること', async () => {
    const longTitle = 'あ'.repeat(250)
    const html = '<html></html>'
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(html) })
    const parsers: HtmlParsers = {
      jmaPress: vi.fn().mockReturnValue([{ title: longTitle, url: 'https://www.med.or.jp/a.html', publishedAt: null }]),
    }

    const { hints } = await fetchGenreHints('medical-health', [htmlEntry], http, parsers)

    expect(hints[0].title.length).toBe(200)
  })

  it('タイトルに制御文字を含む場合は除くこと(プロンプトインジェクション対策)', async () => {
    const html = '<html></html>'
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(html) })
    const nullChar = String.fromCharCode(0)
    const escChar = String.fromCharCode(27)
    const delChar = String.fromCharCode(127)
    const controlCharTitle = `不正${nullChar}な${escChar}タイトルです${delChar}`
    const parsers: HtmlParsers = {
      jmaPress: vi.fn().mockReturnValue([{ title: controlCharTitle, url: 'https://www.med.or.jp/a.html', publishedAt: null }]),
    }

    const { hints } = await fetchGenreHints('medical-health', [htmlEntry], http, parsers)

    expect(hints[0].title).toBe('不正なタイトルです')
  })

  it('urlがhttp/https以外の候補は除外されること', async () => {
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue('<html></html>') })
    const parsers: HtmlParsers = {
      jmaPress: vi.fn().mockReturnValue([{ title: '不正なURL', url: 'javascript:alert(1)', publishedAt: null }]),
    }

    const { hints } = await fetchGenreHints('medical-health', [htmlEntry], http, parsers)

    expect(hints).toEqual([])
  })
})

// 仕様: specs/research-digest/content-selection/requirements.md#収集状況の記録-2
describe('固定情報源の健全性監視 - 収集件数が0件・取得失敗だった情報源を警告として区別できること', () => {
  it('取得に成功し1件以上収集できた情報源はWARNなしの行になること', () => {
    const lines = buildFixedSourceHealthLogLines([{ sourceName: 'Nature Neuroscience', ok: true, count: 3 }])
    expect(lines).toEqual(['Nature Neuroscience: 3件'])
  })

  it('収集0件だった情報源、取得自体に失敗した情報源は、いずれもWARN付きの行になること', () => {
    const lines = buildFixedSourceHealthLogLines([
      { sourceName: 'arXiv cs.AI', ok: true, count: 0 },
      { sourceName: '日本医師会プレスリリース一覧', ok: false, count: 0 },
    ])
    expect(lines).toEqual(['WARN arXiv cs.AI: 0件', 'WARN 日本医師会プレスリリース一覧: 取得失敗'])
  })
})
