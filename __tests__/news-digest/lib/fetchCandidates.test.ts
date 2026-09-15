import { describe, it, expect, vi } from 'vitest'
import { fetchRssCandidates, fetchOfficialPageCandidates, fetchAllCandidates, buildSourceHealthLogLines } from '../../../app/news-digest/lib/fetchCandidates'
import type { HttpClient } from '../../../app/news-digest/lib/fetchCandidates'
import type { WatchlistEntry } from '../../../app/news-digest/lib/watchlistTypes'

const NOW = new Date('2026-09-14T00:00:00+09:00')

function makeHttp(overrides: Partial<HttpClient> = {}): HttpClient {
  return {
    fetchText: vi.fn().mockRejectedValue(new Error('未実装のURL')),
    ...overrides,
  }
}

const nhkEntry: WatchlistEntry = {
  id: 'nhk-news-web',
  category: 'general',
  name: 'NHK NEWS WEB(政治・国際)',
  channels: [{ type: 'rss', feedUrl: 'https://www3.nhk.or.jp/rss/news/cat4.xml' }],
}

const kanagawaPrefEntry: WatchlistEntry = {
  id: 'kanagawa-pref',
  category: 'kanagawa',
  name: '神奈川県公式サイト(お知らせ)',
  channels: [{ type: 'official-page', url: 'https://www.pref.kanagawa.jp/news/index.html' }],
}

function rssXml(items: { title: string; link: string; pubDate: string }[]): string {
  const body = items
    .map((i) => `<item><title>${i.title}</title><link>${i.link}</link><pubDate>${i.pubDate}</pubDate></item>`)
    .join('')
  return `<?xml version="1.0"?><rss><channel>${body}</channel></rss>`
}

function officialPageHtml(items: { title: string; href: string; date: string }[]): string {
  const body = items.map((i) => `<li><a href="${i.href}">${i.title}</a><span>${i.date}</span></li>`).join('')
  return `<html><body><ul>${body}</ul></body></html>`
}

// 仕様: specs/news-digest/content-selection/requirements.md#データ取得方法-1、specs/news-digest/content-selection/design.md#情報源から候補を収集する処理(決定的なコード)
describe('情報源からの候補収集 - 公式RSS・公開ページから直近1週間以内の新着記事のみを候補として抽出する', () => {
  it('公式RSSフィードのうち、直近1週間以内に公開された記事だけが候補として残り、1週間より古い記事は除外されること', async () => {
    const xml = rssXml([
      { title: '3日前の記事', link: 'https://www3.nhk.or.jp/news/a.html', pubDate: 'Fri, 11 Sep 2026 00:00:00 +0900' },
      { title: '8日前の記事(対象外)', link: 'https://www3.nhk.or.jp/news/b.html', pubDate: 'Sat, 06 Sep 2026 00:00:00 +0900' },
    ])
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(xml) })

    const candidates = await fetchRssCandidates(nhkEntry, 'https://www3.nhk.or.jp/rss/news/cat4.xml', http, NOW)

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      sourceId: 'nhk-news-web',
      sourceName: 'NHK NEWS WEB(政治・国際)',
      category: 'general',
      heading: '3日前の記事',
      url: 'https://www3.nhk.or.jp/news/a.html',
    })
  })

  it('公式RSSがない情報源の公開ページから、直近1週間以内の新着項目だけを候補として抽出すること', async () => {
    const html = officialPageHtml([
      { title: '新着のお知らせ', href: '/docs/press/1.html', date: '2026年9月12日' },
      { title: '8日前のお知らせ(対象外)', href: '/docs/press/0.html', date: '2026年9月5日' },
    ])
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(html) })

    const candidates = await fetchOfficialPageCandidates(
      kanagawaPrefEntry,
      'https://www.pref.kanagawa.jp/news/index.html',
      http,
      NOW
    )

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      sourceId: 'kanagawa-pref',
      category: 'kanagawa',
      heading: '新着のお知らせ',
      url: 'https://www.pref.kanagawa.jp/docs/press/1.html',
    })
  })

  it('1つの情報源の取得が失敗しても、その情報源だけを除外して他の情報源の候補は返ること', async () => {
    const okXml = rssXml([{ title: '取得できた記事', link: 'https://www3.nhk.or.jp/news/c.html', pubDate: 'Fri, 11 Sep 2026 00:00:00 +0900' }])
    const fetchText = vi.fn().mockImplementation((url: string) => {
      if (url.includes('kanagawa')) throw new Error('取得失敗')
      return Promise.resolve(okXml)
    })
    const http = makeHttp({ fetchText })

    const { candidates, stats } = await fetchAllCandidates([nhkEntry, kanagawaPrefEntry], http, NOW)

    expect(candidates).toHaveLength(1)
    expect(candidates[0].heading).toBe('取得できた記事')
    expect(stats.find((s) => s.sourceId === 'kanagawa-pref')).toMatchObject({ ok: false, count: 0 })
    expect(stats.find((s) => s.sourceId === 'nhk-news-web')).toMatchObject({ ok: true, count: 1 })
  })
})

// 仕様: specs/news-digest/content-selection/requirements.md#情報源の健全性監視-3
describe('情報源の健全性監視 - 収集件数が0件・取得失敗だった情報源を警告として区別できること', () => {
  it('取得に成功し1件以上収集できた情報源はWARNなしの行になること', () => {
    const lines = buildSourceHealthLogLines([{ sourceId: 'nhk-news-web', sourceName: 'NHK NEWS WEB(政治・国際)', channel: 'rss', ok: true, count: 3 }])
    expect(lines).toEqual(['NHK NEWS WEB(政治・国際)(rss): 3件'])
  })

  it('収集0件だった情報源、取得自体に失敗した情報源は、いずれもWARN付きの行になること(フィードURL変更等での無言停止に気づけるようにするため)', () => {
    const lines = buildSourceHealthLogLines([
      { sourceId: 'kanaloco', sourceName: '神奈川新聞(カナロコ)', channel: 'official-page', ok: true, count: 0 },
      { sourceId: 'kanagawa-pref', sourceName: '神奈川県公式サイト(お知らせ)', channel: 'official-page', ok: false, count: 0 },
    ])
    expect(lines).toEqual([
      'WARN 神奈川新聞(カナロコ)(official-page): 0件',
      'WARN 神奈川県公式サイト(お知らせ)(official-page): 取得失敗',
    ])
  })
})
