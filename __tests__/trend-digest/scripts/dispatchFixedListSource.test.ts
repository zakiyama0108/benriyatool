import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { dispatchFixedListSource } from '../../../scripts/trend-digest/fetchSourcePage'
import type { WatchlistEntry } from '../../../app/trend-digest/lib/watchlistTypes'

const HTML_FIXTURES_DIR = path.join(__dirname, '../fixtures/sourceParsers')
const STRUCTURED_FIXTURES_DIR = path.join(__dirname, '../fixtures/structuredSources')

function readHtmlFixture(name: string): string {
  return fs.readFileSync(path.join(HTML_FIXTURES_DIR, name), 'utf8')
}
function readStructuredFixture(name: string): string {
  return fs.readFileSync(path.join(STRUCTURED_FIXTURES_DIR, name), 'utf8')
}

function mockFetchOnce(body: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/plain; charset=utf-8' },
      arrayBuffer: () => Promise.resolve(new TextEncoder().encode(body).buffer),
      json: () => Promise.resolve(JSON.parse(body)),
    })
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

function sourceOf(overrides: Partial<WatchlistEntry['sources'][number]>): WatchlistEntry['sources'][number] {
  return { name: 'テスト情報源', url: 'https://example.com', region: 'japan', ...overrides }
}

// 仕様: specs/trend-digest/content-selection/design.md「固定リストジャンルの候補を収集・判定する処理」手順1
describe('固定リストジャンルの情報源ディスパッチ - formatに応じてサイトごとの専用パースまたは構造化データの取得・パースへ振り分ける', () => {
  it('format: site-specific-htmlの場合、parserIdが指すパーサー(billboardJapan)が呼び出され、結果が反映されること', async () => {
    mockFetchOnce(readHtmlFixture('billboardJapan.html'))
    const result = await dispatchFixedListSource(sourceOf({ format: 'site-specific-html', parserId: 'billboardJapan' }), 'music')
    expect(result.items).toHaveLength(100)
    expect(result.providesRankChange).toBe(true)
  })

  it('存在しないparserIdが指定された場合、例外を投げること', async () => {
    await expect(
      dispatchFixedListSource(sourceOf({ format: 'site-specific-html', parserId: 'no-such-parser' }), 'music')
    ).rejects.toThrow()
  })

  it('format: structured-rssの場合、Google公式トレンドRSSのパース結果が反映されること', async () => {
    mockFetchOnce(readStructuredFixture('googleTrends.xml'))
    const result = await dispatchFixedListSource(sourceOf({ format: 'structured-rss' }), 'buzzwords')
    expect(result.items).toHaveLength(10)
    expect(result.providesRankChange).toBe(false)
  })

  it('format: structured-tsvの場合、ジャンルに対応するNetflixのcategory(foreign-drama→TV)でパースされること', async () => {
    mockFetchOnce(readStructuredFixture('netflixTop10.tsv'))
    const result = await dispatchFixedListSource(sourceOf({ format: 'structured-tsv' }), 'foreign-drama')
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items[0].title).toBe('Plastic Beauty')
  })

  it('format: structured-tsvでNetflixのcategoryに対応付けられていないジャンル(anime)が指定された場合、例外を投げること(Netflix公式データにアニメ専用の区分が無いため)', async () => {
    mockFetchOnce(readStructuredFixture('netflixTop10.tsv'))
    await expect(dispatchFixedListSource(sourceOf({ format: 'structured-tsv' }), 'anime')).rejects.toThrow()
  })

  it('format: structured-json-apiの場合、Steamのranks(appidのみ)をゲーム名解決した結果が反映されること', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('appdetails')) {
        const appid = new URL(url).searchParams.get('appids')
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: () => Promise.resolve({ [appid as string]: { success: true, data: { name: `Game ${appid}` } } }),
          arrayBuffer: () => Promise.resolve(new TextEncoder().encode('').buffer),
        })
      }
      const json = readStructuredFixture('steamCharts.json')
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        arrayBuffer: () => Promise.resolve(new TextEncoder().encode(json).buffer),
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await dispatchFixedListSource(sourceOf({ format: 'structured-json-api' }), 'games')
    expect(result.items.length).toBeGreaterThan(0)
    expect(result.items[0]).toMatchObject({ title: 'Game 730', currentRank: 1 })
  })
})
