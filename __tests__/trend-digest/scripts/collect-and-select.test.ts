import { describe, it, expect, vi } from 'vitest'
import { collectGenreObservations } from '../../../scripts/trend-digest/collect-and-select'
import type { FixedListFetcher, WebSearchFetcher } from '../../../scripts/trend-digest/collect-and-select'
import type { WatchlistEntry, GenreCriteria } from '../../../app/trend-digest/lib/watchlistTypes'
import type { Candidate } from '../../../app/trend-digest/lib/candidateTypes'

function baseCandidate(overrides: Partial<Candidate>): Candidate {
  return {
    genre: 'anime',
    title: 'テスト作品',
    sourceName: 'テスト情報源',
    sourceUrl: 'https://example.com/a',
    method: 'fixed-list',
    strength: 90,
    rank: 1,
    originRegion: null,
    currentRegions: [],
    strengthJapan: null,
    strengthOverseas: null,
    meetsCriteria: true,
    ...overrides,
  }
}

function animeEntry(): WatchlistEntry {
  return {
    genre: 'anime',
    edition: 'entertainment',
    label: 'アニメ',
    method: 'hybrid',
    sources: [
      { name: 'Filmarksアニメ 話題のおすすめアニメ', url: 'https://example.com/filmarks', format: 'site-specific-html', parserId: 'filmarksAnimeTrend', region: 'japan' },
      { name: 'AniLab 日本ウィークリーアニメランキング', url: 'https://example.com/anilab', format: 'site-specific-html', parserId: 'anilabJapanWeekly', region: 'japan' },
    ],
    searchHints: ['SNS 話題 アニメ 反響'],
  }
}

const hybridCriteria: GenreCriteria = {
  method: 'hybrid',
  fixedList: { newEntryOrRisingRank: true },
  webSearch: { minIndependentSources: 3 },
}

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-7、specs/trend-digest/content-selection/design.md「併用ジャンル(アニメ)の候補を収集・判定する処理」
describe('併用ジャンル(hybrid)の観測項目収集(collectGenreObservations) - 固定リスト側・WebSearch側の両方を呼び出し、観測項目を1つの配列に結合する', () => {
  it('固定リスト側・WebSearch側それぞれの観測項目が1つの配列に結合されること', async () => {
    const fetchFixedList: FixedListFetcher = vi.fn().mockResolvedValue({
      observations: [baseCandidate({ title: '固定リスト側の作品', method: 'fixed-list' })],
      stats: [{ sourceName: 'Filmarksアニメ 話題のおすすめアニメ', sourceUrl: 'https://example.com/filmarks', ok: true, observationCount: 30, candidateCount: 2 }],
    })
    const fetchWebSearch: WebSearchFetcher = vi.fn().mockResolvedValue({
      observations: [baseCandidate({ title: 'WebSearch側の作品', method: 'websearch', rank: null })],
      ok: true,
    })

    const { observations } = await collectGenreObservations(animeEntry(), hybridCriteria, fetchFixedList, fetchWebSearch)

    expect(observations.map((o) => o.title).sort()).toEqual(['WebSearch側の作品', '固定リスト側の作品'])
  })

  it('結合後の各観測項目のmethodが、収集元(fixed-list/websearch)を正しく反映すること', async () => {
    const fetchFixedList: FixedListFetcher = vi.fn().mockResolvedValue({
      observations: [baseCandidate({ title: '固定リスト側の作品', method: 'fixed-list' })],
      stats: [],
    })
    const fetchWebSearch: WebSearchFetcher = vi.fn().mockResolvedValue({
      observations: [baseCandidate({ title: 'WebSearch側の作品', method: 'websearch', rank: null })],
      ok: true,
    })

    const { observations } = await collectGenreObservations(animeEntry(), hybridCriteria, fetchFixedList, fetchWebSearch)

    expect(observations.find((o) => o.title === '固定リスト側の作品')?.method).toBe('fixed-list')
    expect(observations.find((o) => o.title === 'WebSearch側の作品')?.method).toBe('websearch')
  })

  it('固定リスト側の観測が0件でも、WebSearch側の観測は結果に残ること', async () => {
    const fetchFixedList: FixedListFetcher = vi.fn().mockResolvedValue({ observations: [], stats: [] })
    const fetchWebSearch: WebSearchFetcher = vi.fn().mockResolvedValue({
      observations: [baseCandidate({ title: 'WebSearch側のみの作品', method: 'websearch', rank: null })],
      ok: true,
    })

    const { observations } = await collectGenreObservations(animeEntry(), hybridCriteria, fetchFixedList, fetchWebSearch)

    expect(observations.map((o) => o.title)).toEqual(['WebSearch側のみの作品'])
  })

  it('WebSearch側の検索・判定が失敗(ok: false)しても、固定リスト側の観測は結果に残ること', async () => {
    const fetchFixedList: FixedListFetcher = vi.fn().mockResolvedValue({
      observations: [baseCandidate({ title: '固定リスト側のみの作品', method: 'fixed-list' })],
      stats: [],
    })
    const fetchWebSearch: WebSearchFetcher = vi.fn().mockResolvedValue({ observations: [], ok: false, detail: '検索失敗' })

    const { observations } = await collectGenreObservations(animeEntry(), hybridCriteria, fetchFixedList, fetchWebSearch)

    expect(observations.map((o) => o.title)).toEqual(['固定リスト側のみの作品'])
  })

  it('固定リスト側にgenreCriteria.fixedListから組み立てたFixedListGenreCriteria(method: fixed-list)が渡されること', async () => {
    const fetchFixedList: FixedListFetcher = vi.fn().mockResolvedValue({ observations: [], stats: [] })
    const fetchWebSearch: WebSearchFetcher = vi.fn().mockResolvedValue({ observations: [], ok: true })

    await collectGenreObservations(animeEntry(), hybridCriteria, fetchFixedList, fetchWebSearch)

    expect(fetchFixedList).toHaveBeenCalledWith(animeEntry(), { method: 'fixed-list', newEntryOrRisingRank: true })
  })
})

// 仕様: specs/trend-digest/content-selection/design.md「固定リストジャンルの候補を収集・判定する処理」
describe('固定リストジャンル(method: fixed-list)の観測項目収集(collectGenreObservations) - 従来どおり固定リスト側のみを呼び出す', () => {
  it('WebSearch側は呼び出されないこと', async () => {
    const musicEntry: WatchlistEntry = {
      genre: 'music',
      edition: 'entertainment',
      label: '音楽',
      method: 'fixed-list',
      sources: [{ name: 'Billboard JAPAN Hot 100', url: 'https://example.com/billboard', format: 'site-specific-html', parserId: 'billboardJapan', region: 'japan' }],
    }
    const fixedListCriteria: GenreCriteria = { method: 'fixed-list', newEntryOrRisingRank: true }
    const fetchFixedList: FixedListFetcher = vi.fn().mockResolvedValue({
      observations: [baseCandidate({ title: '新曲A', genre: 'music' })],
      stats: [],
    })
    const fetchWebSearch: WebSearchFetcher = vi.fn().mockResolvedValue({ observations: [], ok: true })

    const { observations } = await collectGenreObservations(musicEntry, fixedListCriteria, fetchFixedList, fetchWebSearch)

    expect(observations.map((o) => o.title)).toEqual(['新曲A'])
    expect(fetchWebSearch).not.toHaveBeenCalled()
  })
})

// 仕様: specs/trend-digest/content-selection/design.md「WebSearchジャンルの候補を収集・判定する処理」
describe('WebSearchジャンル(method: websearch)の観測項目収集(collectGenreObservations) - 従来どおりWebSearch側のみを呼び出す', () => {
  it('固定リスト側は呼び出されないこと', async () => {
    const gourmetEntry: WatchlistEntry = {
      genre: 'gourmet',
      edition: 'culture-lifestyle',
      label: 'グルメ',
      method: 'websearch',
      sources: [],
      searchHints: ['話題の飲食店'],
    }
    const webSearchCriteria: GenreCriteria = { method: 'websearch', minIndependentSources: 3 }
    const fetchFixedList: FixedListFetcher = vi.fn().mockResolvedValue({ observations: [], stats: [] })
    const fetchWebSearch: WebSearchFetcher = vi.fn().mockResolvedValue({
      observations: [baseCandidate({ title: '話題の店A', genre: 'gourmet', method: 'websearch', rank: null })],
      ok: true,
    })

    const { observations } = await collectGenreObservations(gourmetEntry, webSearchCriteria, fetchFixedList, fetchWebSearch)

    expect(observations.map((o) => o.title)).toEqual(['話題の店A'])
    expect(fetchFixedList).not.toHaveBeenCalled()
  })
})
