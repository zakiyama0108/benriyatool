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

// 仕様: specs/trend-digest/trend-history/requirements.md#継続度ラベル、specs/trend-digest/trend-history/design.md「途切れずに続いている期間を求める処理」
describe('途切れずに続いている期間の算出(aggregateHistory) - 一度途切れたらそこで区切り、再検知時点から数え直す', () => {
  it('3ヶ月前に1回だけ観測され、間のすべての実行で観測されず、直近の実行で再び観測された話題の継続日数が0になること(初回検知日からの通算で測っていたら約90日になる回帰テスト)', () => {
    const logs = [
      log('2026-06-01', 'entertainment', [observation({ title: '一度きりの話題' })]),
      log('2026-06-08', 'entertainment', []),
      log('2026-08-01', 'entertainment', []),
      log('2026-09-01', 'entertainment', [observation({ title: '一度きりの話題' })]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.continuationDays).toBe(0)
    expect(history.continuationStartDate).toBe('2026-09-01')
  })

  it('直近から連続して検知されている実行をさかのぼり、検知がない実行に当たった直後で止まること(その最古の実行日が継続の開始日、日数は直近検知日との差)', () => {
    const logs = [
      log('2026-08-01', 'entertainment', []),
      log('2026-08-08', 'entertainment', [observation({ title: '継続話題' })]),
      log('2026-08-15', 'entertainment', [observation({ title: '継続話題' })]),
      log('2026-08-22', 'entertainment', [observation({ title: '継続話題' })]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.continuationStartDate).toBe('2026-08-08')
    expect(history.continuationDays).toBe(14)
  })

  it('その編の初回実行で初検知された話題は継続日数0になること(直近検知日より古い実行が1つもない)', () => {
    const logs = [log('2026-09-01', 'entertainment', [observation({ title: '新規話題' })])]
    const [history] = aggregateHistory(logs)
    expect(history.continuationStartDate).toBe('2026-09-01')
    expect(history.continuationDays).toBe(0)
  })

  it('エンタメ編の話題の継続が、間に挟まるカルチャー編の実行(その話題を扱うジャンルがない)によって途切れたと判定されないこと', () => {
    const logs = [
      log('2026-08-08', 'entertainment', [observation({ title: 'エンタメ限定話題' })]),
      log('2026-08-11', 'culture-lifestyle', [observation({ title: '別の話題', genre: 'gourmet', method: 'websearch', rank: null })]),
      log('2026-08-15', 'entertainment', [observation({ title: 'エンタメ限定話題' })]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.continuationStartDate).toBe('2026-08-08')
    expect(history.continuationDays).toBe(7)
  })

  it('両編で観測される話題は、編ごとに求めた継続の開始日のうち最も古いものが採られること', () => {
    const logs = [
      log('2026-08-01', 'entertainment', [observation({ title: '両編話題', genre: 'anime' })]),
      log('2026-08-04', 'culture-lifestyle', [observation({ title: '両編話題', genre: 'buzzwords', rank: 5 })]),
      log('2026-08-08', 'entertainment', [observation({ title: '両編話題', genre: 'anime' })]),
      log('2026-08-11', 'culture-lifestyle', [observation({ title: '両編話題', genre: 'buzzwords', rank: 5 })]),
    ]
    const [history] = aggregateHistory(logs)
    // entertainment側は8/1〜8/8で継続、culture-lifestyle側は8/4〜8/11で継続。最も古い8/1が採られる
    expect(history.continuationStartDate).toBe('2026-08-01')
  })

  it('片方の編で扱いが終わって観測されなくなっても、継続が切れたとはみなされないこと(編ごとの継続開始日のうち最も古いものを採る)', () => {
    const logs = [
      log('2026-08-01', 'entertainment', [observation({ title: '両編話題', genre: 'anime' })]),
      log('2026-08-04', 'culture-lifestyle', [observation({ title: '両編話題', genre: 'buzzwords', rank: 5 })]),
      log('2026-08-08', 'entertainment', []), // entertainment側はこの回以降扱いが終わる(観測されなくなる)
      log('2026-08-11', 'culture-lifestyle', [observation({ title: '両編話題', genre: 'buzzwords', rank: 5 })]),
    ]
    const [history] = aggregateHistory(logs)
    // entertainment側の継続開始日(8/1)がculture-lifestyle側(8/4)より古いため、8/1が採られる
    expect(history.continuationStartDate).toBe('2026-08-01')
    expect(history.lastDetectedDate).toBe('2026-08-11')
  })

  it('ある週の観測ログ自体が存在しない(欠測)場合、その週は実行の並びに現れず、継続のさかのぼりで飛ばされ、継続日数が0に戻らないこと', () => {
    const logs = [
      log('2026-08-01', 'entertainment', [observation({ title: '継続話題' })]),
      log('2026-08-08', 'entertainment', [observation({ title: '継続話題' })]),
      // 2026-08-15は週次実行そのものが失敗し、観測ログが存在しない(欠測)
      log('2026-08-22', 'entertainment', [observation({ title: '継続話題' })]),
    ]
    const [history] = aggregateHistory(logs)
    expect(history.continuationStartDate).toBe('2026-08-01')
    expect(history.continuationDays).toBe(21)
  })

  it('今回の実行で検知されなかった話題も、過去の継続期間をそのまま持ち、現在まで引き伸ばされないこと', () => {
    const logs = [
      log('2026-08-01', 'entertainment', [observation({ title: '過去の話題' })]),
      log('2026-08-08', 'entertainment', [observation({ title: '過去の話題' })]),
      log('2026-08-15', 'entertainment', []), // 今回の実行では検知されなかった
    ]
    const [history] = aggregateHistory(logs)
    expect(history.lastDetectedDate).toBe('2026-08-08')
    expect(history.continuationStartDate).toBe('2026-08-01')
    expect(history.continuationDays).toBe(7)
  })
})
