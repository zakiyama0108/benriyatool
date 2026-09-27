import { describe, it, expect } from 'vitest'
import { aggregateHistory } from '../../../app/trend-digest/lib/aggregateHistory'
import type { ObservationLog, Observation } from '../../../app/trend-digest/lib/historyTypes'

function observation(overrides: Partial<Observation> = {}): Observation {
  return {
    genre: 'music',
    title: '新曲A',
    strength: 30,
    meetsCriteria: true,
    rank: 1,
    method: 'fixed-list',
    originRegion: null,
    currentRegions: [],
    strengthJapan: null,
    strengthOverseas: null,
    ...overrides,
  }
}

function log(date: string, edition: ObservationLog['edition'], observations: Observation[]): ObservationLog {
  return { date, edition, observations }
}

// 仕様: specs/trend-digest/trend-history/design.md「履歴を話題ごとの系列に集約する処理」、specs/trend-digest/trend-history/requirements.md#機能要件-4
describe('観測ログの話題ごとの系列への集約(aggregateHistory) - 正規化タイトルごとに1本の系列へまとめる', () => {
  it('観測ログが1件もないとき、空の結果になること', () => {
    expect(aggregateHistory([])).toEqual([])
  })

  it('同じ正規化タイトルの観測が複数回あっても1本の系列にまとまること', () => {
    const logs = [
      log('2026-09-01', 'entertainment', [observation({ title: '新曲A' })]),
      log('2026-09-08', 'entertainment', [observation({ title: ' 新曲a ' })]),
    ]
    const histories = aggregateHistory(logs)
    expect(histories).toHaveLength(1)
  })

  it('ジャンルが違っても同じ正規化タイトルなら同じ系列にまとまること', () => {
    const logs = [
      log('2026-09-01', 'entertainment', [observation({ title: '共通作品', genre: 'anime' })]),
      log('2026-09-08', 'entertainment', [observation({ title: '共通作品', genre: 'books-comics' })]),
    ]
    const histories = aggregateHistory(logs)
    expect(histories).toHaveLength(1)
    expect(histories[0].latestGenre).toBe('books-comics')
  })

  it('初回検知日・直近検知日が正しく求まること', () => {
    const logs = [
      log('2026-09-01', 'entertainment', [observation({ title: '新曲A' })]),
      log('2026-09-08', 'entertainment', [observation({ title: '新曲A' })]),
      log('2026-09-15', 'entertainment', [observation({ title: '新曲A' })]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.firstDetectedDate).toBe('2026-09-01')
    expect(history.lastDetectedDate).toBe('2026-09-15')
  })

  it('検知した実行回数が求まり、同じ回に両方式で観測された話題の検知回数が1回と数えられること', () => {
    const logs = [
      log('2026-09-01', 'entertainment', [
        observation({ title: 'アニメX', genre: 'anime', method: 'fixed-list', rank: 2 }),
        observation({ title: 'アニメX', genre: 'anime', method: 'websearch', rank: null, strength: 4 }),
      ]),
      log('2026-09-08', 'entertainment', [observation({ title: 'アニメX', genre: 'anime', method: 'fixed-list', rank: 3 })]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.detectionCount).toBe(2)
  })

  it('observedEditionsに観測された編がすべて入ること', () => {
    const logs = [
      log('2026-09-01', 'entertainment', [observation({ title: '両編話題', genre: 'anime' })]),
      log('2026-09-04', 'culture-lifestyle', [observation({ title: '両編話題', genre: 'buzzwords', rank: 5 })]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.observedEditions.sort()).toEqual(['culture-lifestyle', 'entertainment'])
  })

  it('直近の観測のジャンル・選定方式・強さ・順位が取り出されること', () => {
    const logs = [
      log('2026-09-01', 'entertainment', [observation({ title: '新曲A', rank: 5, strength: 25 })]),
      log('2026-09-08', 'entertainment', [observation({ title: '新曲A', rank: 2, strength: 28 })]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.latestRank).toBe(2)
    expect(history.latestStrength).toBe(28)
    expect(history.latestMethod).toBe('fixed-list')
  })

  it('同じ回に両方式で観測されている場合は固定リストジャンルの観測が直近として採られること', () => {
    const logs = [
      log('2026-09-01', 'entertainment', [
        observation({ title: 'アニメX', genre: 'anime', method: 'websearch', rank: null, strength: 4 }),
        observation({ title: 'アニメX', genre: 'anime', method: 'fixed-list', rank: 3, strength: 27 }),
      ]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.latestMethod).toBe('fixed-list')
    expect(history.latestRank).toBe(3)
  })

  it('原題・主な流行地域は直近の観測の値が採られること', () => {
    const logs = [
      log('2026-09-01', 'entertainment', [observation({ title: '新曲A', currentRegions: ['日本'] })]),
      log('2026-09-08', 'entertainment', [observation({ title: '新曲A', currentRegions: ['韓国', '日本'] })]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.latestTitle).toBe('新曲A')
    expect(history.currentRegions).toEqual(['韓国', '日本'])
  })

  it('発祥地域は最も古い観測で判定できた値が優先されること(後の回でnullになっても失われない)', () => {
    const logs = [
      log('2026-09-01', 'entertainment', [observation({ title: '新曲A', originRegion: '日本' })]),
      log('2026-09-08', 'entertainment', [observation({ title: '新曲A', originRegion: null })]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.originRegion).toBe('日本')
  })

  it('発祥地域がどの観測でも判定できなければnullのままになること', () => {
    const logs = [log('2026-09-01', 'entertainment', [observation({ title: '新曲A', originRegion: null })])]
    const [history] = aggregateHistory(logs)
    expect(history.originRegion).toBeNull()
  })
})
