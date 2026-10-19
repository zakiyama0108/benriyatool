import { describe, it, expect, vi } from 'vitest'
import { fetchFixedSourceHints, buildFixedSourceHealthLogLines } from '../../../app/future-digest/lib/fetchFixedSourceHints'
import type { HttpClient } from '../../../app/future-digest/lib/fetchFixedSourceHints'
import type { FixedSourceEntry } from '../../../app/future-digest/lib/fixedSourceTypes'

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
  genreId: 'technology-ai',
  name: 'MIT Technology Review',
  channel: { type: 'feed', url: 'https://www.technologyreview.com/feed/' },
}

const htmlEntry: FixedSourceEntry = {
  genreId: 'medical-health',
  name: 'AMED',
  channel: { type: 'site-specific-html', url: 'https://www.amed.go.jp/news/index.html', parserId: 'amedNews' },
}

// 仕様: specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-1、specs/future-digest/content-selection/requirements.md#データ取得方法-2、specs/future-digest/content-selection/design.md「固定情報源からヒントを集める処理」
describe('固定情報源からのヒント取得 - feed/site-specific-htmlの両形式から取得し、1件の失敗で他に影響しないこと', () => {
  it('feed形式の情報源からヒントを取得できること', async () => {
    const xml = rssXml([{ title: '見出しA', link: 'https://www.technologyreview.com/a', pubDate: 'Fri, 16 Oct 2026 18:00:00 +0000' }])
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(xml) })

    const { hints, failures } = await fetchFixedSourceHints([feedEntry], http)

    expect(hints).toEqual([
      { sourceName: 'MIT Technology Review', title: '見出しA', url: 'https://www.technologyreview.com/a', publishedAt: 'Fri, 16 Oct 2026 18:00:00 +0000' },
    ])
    expect(failures).toEqual([])
  })

  it('site-specific-html形式の情報源は対応するparserIdの専用パーサーで取得できること', async () => {
    const html = `<li><div class="head"><span class="date">令和8年10月19日</span></div><a href="/news/topics/a.html">見出しB</a></li>`
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(html) })

    const { hints, failures } = await fetchFixedSourceHints([htmlEntry], http)

    expect(hints).toEqual([
      { sourceName: 'AMED', title: '見出しB', url: 'https://www.amed.go.jp/news/topics/a.html', publishedAt: '令和8年10月19日' },
    ])
    expect(failures).toEqual([])
  })

  it('1つの情報源の取得が失敗しても、その情報源だけを除外して他の情報源のヒントは返り、失敗はfailuresに記録されること', async () => {
    const xml = rssXml([{ title: '取得できた見出し', link: 'https://www.technologyreview.com/ok', pubDate: 'Fri, 16 Oct 2026 18:00:00 +0000' }])
    const fetchText = vi.fn().mockImplementation((url: string) => {
      if (url.includes('amed')) throw new Error('取得失敗')
      return Promise.resolve(xml)
    })
    const http = makeHttp({ fetchText })

    const { hints, failures } = await fetchFixedSourceHints([feedEntry, htmlEntry], http)

    expect(hints).toEqual([
      { sourceName: 'MIT Technology Review', title: '取得できた見出し', url: 'https://www.technologyreview.com/ok', publishedAt: 'Fri, 16 Oct 2026 18:00:00 +0000' },
    ])
    expect(failures).toEqual([{ sourceName: 'AMED', message: '取得失敗' }])
  })

  it('対象ジャンルに固定情報源がない場合は空配列を返すこと', async () => {
    const http = makeHttp()
    expect(await fetchFixedSourceHints([], http)).toEqual({ hints: [], failures: [] })
    expect(http.fetchText).not.toHaveBeenCalled()
  })

  it('取得件数が情報源あたり10件を超えないこと', async () => {
    const items = Array.from({ length: 15 }, (_, i) => ({ title: `見出し${i}`, link: `https://www.technologyreview.com/${i}`, pubDate: 'Fri, 16 Oct 2026 18:00:00 +0000' }))
    const http = makeHttp({ fetchText: vi.fn().mockResolvedValue(rssXml(items)) })

    const { hints } = await fetchFixedSourceHints([feedEntry], http)

    expect(hints).toHaveLength(10)
  })
})

// 仕様: specs/future-digest/content-selection/design.md「固定情報源からヒントを集める処理」手順4
describe('固定情報源の健全性ログ - 情報源ごとに取得件数・取得失敗をログ行として出すこと', () => {
  it('取得できた情報源は件数つきの行になること', () => {
    const lines = buildFixedSourceHealthLogLines(
      [feedEntry],
      [{ sourceName: 'MIT Technology Review', title: 'A', url: 'https://example.com/a', publishedAt: null }],
      []
    )
    expect(lines).toEqual(['MIT Technology Review: 1件'])
  })

  it('0件だった情報源、取得自体に失敗した情報源は、いずれもWARN付きの行になること', () => {
    const lines = buildFixedSourceHealthLogLines(
      [feedEntry, htmlEntry],
      [],
      [{ sourceName: 'AMED', message: '取得失敗' }]
    )
    expect(lines).toEqual(['WARN MIT Technology Review: 0件', 'WARN AMED: 取得失敗(取得失敗)'])
  })
})
