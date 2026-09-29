import { describe, it, expect } from 'vitest'
import { buildCriteriaText, buildSourceDirectory } from '../../../app/trend-digest/lib/buildSourceDirectory'
import type { Criteria, GenreCriteria, WatchlistEntry } from '../../../app/trend-digest/lib/watchlistTypes'
import { GENRE_ORDER } from '../../../app/trend-digest/lib/types'
import type { Genre } from '../../../app/trend-digest/lib/types'

const ALL_GENRES = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]

// テスト用に全19ジャンル分のwatchlist・criteriaフィクスチャを組み立てる。実データ
// (content/trend-digest/watchlist.json・criteria.json)の妥当性は__tests__/trend-digest/lib/
// watchlistData.test.tsが担うため、ここでは組み立てロジック自体の検証に専念する
function makeWatchlist(overrides: Partial<Record<Genre, WatchlistEntry>> = {}): WatchlistEntry[] {
  return ALL_GENRES.map((genre) => {
    if (overrides[genre]) return overrides[genre]
    const edition = GENRE_ORDER.entertainment.includes(genre) ? 'entertainment' : 'culture-lifestyle'
    if (genre === 'anime') {
      return {
        genre,
        edition,
        label: 'アニメ',
        method: 'hybrid',
        sources: [
          { name: 'Filmarksアニメ 話題のおすすめアニメ', url: 'https://filmarks.com/list-anime/trend', format: 'site-specific-html', parserId: 'filmarksAnimeTrend', region: 'japan' },
          { name: 'AniLab 日本ウィークリーアニメランキング', url: 'https://anilabb.com/rate/anime?region=japan', format: 'site-specific-html', parserId: 'anilabJapanWeekly', region: 'japan' },
        ],
        searchHints: ['SNS 話題 アニメ 反響'],
      }
    }
    if (genre === 'sns-buzz') {
      return { genre, edition, label: 'SNSバズり', method: 'websearch', sources: [], searchHints: ['Xで話題 バズり 複数メディア'] }
    }
    // それ以外はダミーの固定リストジャンル(1情報源)として扱う
    return {
      genre,
      edition,
      label: genre,
      method: 'fixed-list',
      sources: [{ name: `${genre}のダミー情報源`, url: `https://example.com/${genre}`, format: 'site-specific-html', parserId: 'dummy', region: 'japan' }],
    }
  })
}

function makeCriteria(overrides: Partial<Record<Genre, GenreCriteria>> = {}): Criteria {
  const genreCriteria: Partial<Record<Genre, GenreCriteria>> = {}
  for (const genre of ALL_GENRES) {
    if (overrides[genre]) {
      genreCriteria[genre] = overrides[genre]
      continue
    }
    if (genre === 'anime') {
      genreCriteria[genre] = { method: 'hybrid', fixedList: { newEntryOrRisingRank: true }, webSearch: { minIndependentSources: 3 } }
    } else if (genre === 'sns-buzz') {
      genreCriteria[genre] = { method: 'websearch', minIndependentSources: 3 }
    } else {
      genreCriteria[genre] = { method: 'fixed-list', rankThreshold: 5 }
    }
  }
  return {
    newEntryLookbackWeeks: 4,
    genreCriteria: genreCriteria as Record<Genre, GenreCriteria>,
    history: {
      emergingMinDays: 14,
      talkedMinDays: 30,
      highlyTalkedMinDays: 90,
      maxObservationsPerSource: 30,
      heatMinObservationRuns: 12,
      heatRankHigh: 3,
      heatRankNormal: 10,
      heatSourcesHigh: 5,
      heatSourcesNormal: 3,
    },
  }
}

// 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-4、specs/trend-digest/source-directory/requirements.md#機能要件-6、specs/trend-digest/source-directory/design.md「採用基準を日本語にする処理」
describe('採用基準を日本語にする処理 - 採用基準の定義から表示用の文言を導出し、ジャンルごとの固定文をページに書き込まない', () => {
  it('上位何位以内かだけを持つ固定リストジャンルは「上位◯位以内」になること', () => {
    const criteria: GenreCriteria = { method: 'fixed-list', rankThreshold: 5 }
    expect(buildCriteriaText(criteria)).toBe('上位5位以内')
  })

  it('新規ランクインまたは順位上昇だけを持つ固定リストジャンルは「新規ランクイン、または順位上昇」になること', () => {
    const criteria: GenreCriteria = { method: 'fixed-list', newEntryOrRisingRank: true }
    expect(buildCriteriaText(criteria)).toBe('新規ランクイン、または順位上昇')
  })

  it('順位の改善幅もあわせて持つ固定リストジャンルは、改善幅を含む文言になること', () => {
    const criteria: GenreCriteria = {
      method: 'fixed-list',
      newEntryOrRisingRank: true,
      risingRankMinImprovement: 10,
    }
    expect(buildCriteriaText(criteria)).toBe('新規ランクイン、または順位が10位以上上昇')
  })

  it('上位何位以内か・新規ランクインまたは順位上昇の両方を持つジャンル(書籍・漫画)は「かつ」で結ばれた文言になること', () => {
    const criteria: GenreCriteria = {
      method: 'fixed-list',
      rankThreshold: 5,
      newEntryOrRisingRank: true,
    }
    const text = buildCriteriaText(criteria)
    expect(text).toContain('上位5位以内')
    expect(text).toContain('かつ')
    expect(text).toContain('新規ランクイン')
  })

  it('WebSearchジャンルは「独立した言及元が◯件以上」になること', () => {
    const criteria: GenreCriteria = { method: 'websearch', minIndependentSources: 3 }
    expect(buildCriteriaText(criteria)).toBe('独立した言及元が3件以上')
  })

  // 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-6、specs/trend-digest/source-directory/design.md「採用基準を日本語にする処理」
  it('併用ジャンル(hybrid)は「(固定リスト側の条件)、またはWebSearchで独立した言及元が◯件以上」というOR条件が伝わる文言になること', () => {
    const criteria: GenreCriteria = {
      method: 'hybrid',
      fixedList: { newEntryOrRisingRank: true },
      webSearch: { minIndependentSources: 3 },
    }
    const text = buildCriteriaText(criteria)
    expect(text).toContain('新規ランクイン、または順位上昇')
    expect(text).toContain('または')
    expect(text).toContain('WebSearch')
    expect(text).toContain('独立した言及元が3件以上')
  })

  // 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-5
  it('採用基準の値(上位何位以内か)を変えると表示文も変わること(ジャンルごとの固定文を書き込んでいないことの回帰テスト)', () => {
    const before = buildCriteriaText({ method: 'fixed-list', rankThreshold: 5 })
    const after = buildCriteriaText({ method: 'fixed-list', rankThreshold: 10 })
    expect(before).not.toBe(after)
    expect(after).toBe('上位10位以内')
  })

  it('採用基準の値(独立言及元の最低件数)を変えると表示文も変わること(ジャンルごとの固定文を書き込んでいないことの回帰テスト)', () => {
    const before = buildCriteriaText({ method: 'websearch', minIndependentSources: 3 })
    const after = buildCriteriaText({ method: 'websearch', minIndependentSources: 5 })
    expect(before).not.toBe(after)
    expect(after).toBe('独立した言及元が5件以上')
  })
})

// 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-1、specs/trend-digest/source-directory/requirements.md#機能要件-2、specs/trend-digest/source-directory/requirements.md#機能要件-3、specs/trend-digest/source-directory/requirements.md#機能要件-6、specs/trend-digest/source-directory/requirements.md#表示の順序-6、specs/trend-digest/source-directory/design.md「表示する行を組み立てる処理」
describe('情報源一覧の表示行の組み立て - watchlist.json・criteria.jsonから表示専用の行を組み立て、このページ用のデータを別に持たない', () => {
  it('19ジャンル全件分の行が返ること', () => {
    const rows = buildSourceDirectory(makeWatchlist(), makeCriteria())
    expect(rows).toHaveLength(19)
  })

  it('固定リストジャンルの行に、ジャンル名・編・選定方式が日本語で入ること', () => {
    const rows = buildSourceDirectory(makeWatchlist(), makeCriteria())
    // 先頭行はGENRE_ORDER.entertainmentの1番目(music)になる想定(表示の順序-6)
    const first = rows[0]
    expect(first.genreLabel).toBe('音楽')
    expect(first.editionLabel).toBe('エンタメ編')
    expect(first.methodLabel).toBe('固定リスト')
  })

  it('複数情報源を持つ固定リストジャンルの行に、情報源の名前・URL・地域区分がすべて入ること', () => {
    const watchlist = makeWatchlist({
      'japanese-movie': {
        genre: 'japanese-movie',
        edition: 'entertainment',
        label: '日本映画',
        method: 'fixed-list',
        sources: [
          { name: '興行通信社CINEMAランキング通信(国内)', url: 'https://www.kogyotsushin.com/archives/weekend/', format: 'site-specific-html', parserId: 'kogyoTsushin', region: 'japan' },
          { name: '映画.com国内ランキング', url: 'https://eiga.com/ranking/jp/', format: 'site-specific-html', parserId: 'eigaCom', region: 'japan' },
          { name: 'Filmarks上映中ランキング', url: 'https://filmarks.com/list/now', format: 'site-specific-html', parserId: 'filmarks', region: 'japan' },
        ],
      },
    })
    const rows = buildSourceDirectory(watchlist, makeCriteria())
    const row = rows.find((r) => r.genreLabel === '日本映画')
    expect(row?.sources).toHaveLength(3)
    expect(row?.sources.map((s) => s.name)).toEqual([
      '興行通信社CINEMAランキング通信(国内)',
      '映画.com国内ランキング',
      'Filmarks上映中ランキング',
    ])
    expect(row?.sources[0].url).toBe('https://www.kogyotsushin.com/archives/weekend/')
    expect(row?.sources[0].regionLabel).toBe('日本')
  })

  it('WebSearchジャンルの行に検索の手がかりが入り、情報源の一覧が空になること', () => {
    const rows = buildSourceDirectory(makeWatchlist(), makeCriteria())
    const row = rows.find((r) => r.genreLabel === 'SNSバズり')
    expect(row?.methodLabel).toBe('WebSearch')
    expect(row?.sources).toEqual([])
    expect(row?.searchHints).toEqual(['Xで話題 バズり 複数メディア'])
  })

  // 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-6
  it('併用ジャンル(アニメ)の選定方式が「固定リスト+WebSearch」になり、情報源の一覧と検索の手がかりの両方が入ること', () => {
    const rows = buildSourceDirectory(makeWatchlist(), makeCriteria())
    const row = rows.find((r) => r.genreLabel === 'アニメ')
    expect(row?.methodLabel).toBe('固定リスト+WebSearch')
    expect(row?.sources.map((s) => s.name)).toEqual([
      'Filmarksアニメ 話題のおすすめアニメ',
      'AniLab 日本ウィークリーアニメランキング',
    ])
    expect(row?.searchHints).toEqual(['SNS 話題 アニメ 反響'])
  })

  it('エンタメ編9ジャンルが先・カルチャー・ライフスタイル編10ジャンルが後に並び、編の中はGENRE_ORDERと同じ順になること(ウォッチリストの登録順が変わっても表示順は変わらない)', () => {
    // 意図的に登録順を全体で逆順にしたwatchlistを渡す
    const reversedWatchlist = [...makeWatchlist()].reverse()
    const rows = buildSourceDirectory(reversedWatchlist, makeCriteria())

    expect(rows).toHaveLength(19)
    expect(rows.slice(0, 9).every((r) => r.editionLabel === 'エンタメ編')).toBe(true)
    expect(rows.slice(9).every((r) => r.editionLabel === 'カルチャー・ライフスタイル編')).toBe(true)
    // 編の中はGENRE_ORDERと同じ順(登録順が逆でも、GENRE_LABELSを介した並びは変わらない)
    expect(rows[0].genreLabel).toBe('音楽') // GENRE_ORDER.entertainmentの1番目
    expect(rows[8].genreLabel).toBe('書籍・漫画') // GENRE_ORDER.entertainmentの9番目(最後)
    expect(rows[9].genreLabel).toBe('SNSバズり') // GENRE_ORDER['culture-lifestyle']の1番目
    expect(rows[18].genreLabel).toBe('開発手法・開発サービス') // 最後のジャンル
  })

  // 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-5
  it('watchlist.jsonに存在しない情報源・ジャンルが行に現れないこと(表示元のデータを加工して別に持たない)', () => {
    const watchlist = makeWatchlist({
      'japanese-movie': {
        genre: 'japanese-movie',
        edition: 'entertainment',
        label: '日本映画',
        method: 'fixed-list',
        sources: [
          { name: '映画.com国内ランキング', url: 'https://eiga.com/ranking/jp/', format: 'site-specific-html', parserId: 'eigaCom', region: 'japan' },
        ],
      },
    })
    const rows = buildSourceDirectory(watchlist, makeCriteria())
    const row = rows.find((r) => r.genreLabel === '日本映画')
    expect(row?.sources).toHaveLength(1)
    expect(row?.sources.map((s) => s.name)).toEqual(['映画.com国内ランキング'])
  })
})
