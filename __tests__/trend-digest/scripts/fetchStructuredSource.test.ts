import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi } from 'vitest'
import {
  parseNetflixTsv,
  parseGoogleTrendsRss,
  parseSteamMostPlayed,
  resolveSteamRanking,
} from '../../../scripts/trend-digest/fetchStructuredSource'
import type { SteamAppNameFetcher } from '../../../scripts/trend-digest/fetchStructuredSource'

const FIXTURES_DIR = path.join(__dirname, '../fixtures/structuredSources')

function readFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES_DIR, name), 'utf8')
}

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-4、specs/trend-digest/content-selection/design.md「データ設計」FixedListSourceFormat
describe('Netflix公式Top10データ(structured-tsv)のパース - 実際に取得したTSVサンプルから対象国・カテゴリの最新週のランキングと前週比を抽出する', () => {
  const tsv = readFixture('netflixTop10.tsv')

  it('日本(Japan)のTVカテゴリの最新週(2週分のうち新しい方)のランキングが順位どおりに抽出されること', () => {
    const items = parseNetflixTsv(tsv, 'Japan', 'TV')
    expect(items).toHaveLength(10)
    expect(items[0].currentRank).toBe(1)
    expect(items[0].title).toBe('Plastic Beauty')
  })

  it('前週に同じ作品・同じシーズンが同順位以外で存在した場合、その前週順位がpreviousRankとして抽出されること', () => {
    const items = parseNetflixTsv(tsv, 'Japan', 'TV')
    const untilTheTShirtDries = items.find((i) => i.title === 'Until the T-shirt Dries')
    expect(untilTheTShirtDries).toMatchObject({ currentRank: 2, previousRank: 2 })
  })

  it('前週の同カテゴリに存在しなかった作品は新規ランクイン(isNew: true)として抽出されること', () => {
    const items = parseNetflixTsv(tsv, 'Japan', 'TV')
    const plasticBeauty = items.find((i) => i.title === 'Plastic Beauty')
    expect(plasticBeauty?.isNew).toBe(true)
  })

  it('同じshow_titleでも季(season_title)が異なる作品が同時にランクインしている場合、季ごとに正しく前週順位が突き合わされること(Badly in LoveのSeason 2)', () => {
    const items = parseNetflixTsv(tsv, 'Japan', 'TV')
    const badlyInLove = items.find((i) => i.title === 'Badly in Love')
    // 前週: Season2が1位、Season1が5位。今週のBadly in LoveはSeason2(4位)のため、
    // Season1の前週順位(5位)と混同せず、Season2の前週順位(1位)が抽出されること
    expect(badlyInLove).toMatchObject({ currentRank: 4, previousRank: 1 })
  })

  it('日本の映画(Films)カテゴリも抽出できること(カテゴリの取り違えがないことの確認)', () => {
    const items = parseNetflixTsv(tsv, 'Japan', 'Films')
    expect(items).toHaveLength(10)
    expect(items[0].title).toBe('Golden Kamuy -The Abashiri Prison Raid-')
  })

  it('対象国が異なる行(Argentina)は日本のランキングに混ざらないこと', () => {
    const items = parseNetflixTsv(tsv, 'Japan', 'Films')
    expect(items.some((i) => i.title === 'Riot')).toBe(false)
  })

  it('該当する国・カテゴリの行が1件もない場合、空配列を返すこと', () => {
    expect(parseNetflixTsv(tsv, 'France', 'TV')).toEqual([])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-6、specs/trend-digest/content-selection/design.md「データ設計」FixedListSourceFormat
describe('Google公式トレンドRSS(structured-rss)のパース - 実際に取得したRSSサンプルから話題語を掲載順に抽出する', () => {
  const items = parseGoogleTrendsRss(readFixture('googleTrends.xml'))

  it('フィード内の<item>の件数分の観測項目が取得できること', () => {
    expect(items).toHaveLength(10)
  })

  it('フィードの掲載順どおりに1位から順位が振られ、1件目のタイトルが正しく抽出されること', () => {
    expect(items[0]).toMatchObject({ currentRank: 1, title: 'ダイハツ・タント' })
    expect(items[1]).toMatchObject({ currentRank: 2, title: '京都大賞典' })
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-7、specs/trend-digest/content-selection/design.md「データ設計」FixedListSourceFormat
describe('Steam公式Web API(structured-json-api)のパース - 実際に取得したJSONサンプルから順位・appidを抽出する(ゲーム名はappidに紐付かないため別途解決が必要)', () => {
  const ranks = parseSteamMostPlayed(readFixture('steamCharts.json'))

  it('ranks配列の件数分の観測項目が取得できること', () => {
    expect(ranks.length).toBeGreaterThan(0)
  })

  it('1位のappid・前週順位が正しく抽出されること(このAPIはゲーム名を返さないため、appidのみで順位を表す)', () => {
    expect(ranks[0]).toMatchObject({ rank: 1, appid: 730, previousRank: 1 })
  })

  it('応答がJSONとして不正な場合、例外を投げず空配列を返すこと', () => {
    expect(parseSteamMostPlayed('not a json')).toEqual([])
  })

  it('response.ranksを持たない応答の場合、空配列を返すこと', () => {
    expect(parseSteamMostPlayed(JSON.stringify({ response: {} }))).toEqual([])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-7
describe('Steam公式Web APIのゲーム名解決(resolveSteamRanking) - appdetailsは1呼び出しにつきappid1件のみ解決できるため、上位nameResolutionLimit件までのゲーム名を解決する', () => {
  it('上位nameResolutionLimit件までのappidだけ名前解決が行われ、それ以降は解決されないこと', async () => {
    const ranks = [
      { rank: 1, appid: 730 },
      { rank: 2, appid: 570 },
      { rank: 3, appid: 999 },
    ]
    const fetchAppName: SteamAppNameFetcher = vi.fn().mockImplementation((appid: number) =>
      Promise.resolve(appid === 730 ? 'Counter-Strike 2' : appid === 570 ? 'Dota 2' : 'Unresolved Game')
    )
    const items = await resolveSteamRanking(ranks, fetchAppName, 2)
    expect(items).toEqual([
      { title: 'Counter-Strike 2', currentRank: 1 },
      { title: 'Dota 2', currentRank: 2 },
    ])
    expect(fetchAppName).toHaveBeenCalledTimes(2)
  })

  it('前週順位(previousRank)を持つ項目は、解決後のRankedItemにもpreviousRankが引き継がれること', async () => {
    const ranks = [{ rank: 1, appid: 730, previousRank: 2 }]
    const fetchAppName: SteamAppNameFetcher = vi.fn().mockResolvedValue('Counter-Strike 2')
    const items = await resolveSteamRanking(ranks, fetchAppName, 10)
    expect(items).toEqual([{ title: 'Counter-Strike 2', currentRank: 1, previousRank: 2 }])
  })

  it('名前解決に失敗した(nullが返る)appidは、その項目を観測項目から除外すること(架空の名前を作らない)', async () => {
    const ranks = [
      { rank: 1, appid: 730 },
      { rank: 2, appid: 12345 },
    ]
    const fetchAppName: SteamAppNameFetcher = vi.fn().mockImplementation((appid: number) =>
      Promise.resolve(appid === 730 ? 'Counter-Strike 2' : null)
    )
    const items = await resolveSteamRanking(ranks, fetchAppName, 10)
    expect(items).toEqual([{ title: 'Counter-Strike 2', currentRank: 1 }])
  })
})
