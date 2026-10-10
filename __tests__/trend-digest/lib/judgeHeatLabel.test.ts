import { describe, it, expect } from 'vitest'
import { judgeHeatLabel, buildGenreHeatStats } from '../../../app/trend-digest/lib/judgeHeatLabel'
import type { GenreHeatStats } from '../../../app/trend-digest/lib/judgeHeatLabel'
import type { HistoryCriteria } from '../../../app/trend-digest/lib/historyTypes'
import type { ObservationLog, Observation } from '../../../app/trend-digest/lib/historyTypes'

const criteria: HistoryCriteria = {
  emergingMinDays: 14,
  talkedMinDays: 30,
  highlyTalkedMinDays: 90,
  maxObservationsPerSource: 30,
  heatMinObservationRuns: 12,
  heatRankHigh: 3,
  heatRankNormal: 10,
  heatSourcesHigh: 5,
  heatSourcesNormal: 3,
}

function target(overrides: { rank?: number | null; strength?: number } = {}) {
  return { rank: 'rank' in overrides ? (overrides.rank ?? null) : 1, strength: overrides.strength ?? 30 }
}

function stats(overrides: Partial<GenreHeatStats> = {}): GenreHeatStats {
  return { runCount: 5, strengths: [10, 20, 30], ...overrides }
}

// 仕様: specs/trend-digest/trend-history/requirements.md#注目度ラベル-9
describe('注目度ラベルの判定(judgeHeatLabel) - 過去の観測が貯まっていない場合は情報源での位置から決める', () => {
  it('固定リストジャンルで順位1位・3位(heatRankHigh以内)は「高い」になること', () => {
    expect(judgeHeatLabel(target({ rank: 1 }), stats({ runCount: 5 }), criteria)).toEqual({ label: 'high', basis: 'source-position' })
    expect(judgeHeatLabel(target({ rank: 3 }), stats({ runCount: 5 }), criteria)).toEqual({ label: 'high', basis: 'source-position' })
  })

  it('固定リストジャンルで順位4位・10位(heatRankHigh超・heatRankNormal以内)は「普通」になること', () => {
    expect(judgeHeatLabel(target({ rank: 4 }), stats({ runCount: 5 }), criteria).label).toBe('normal')
    expect(judgeHeatLabel(target({ rank: 10 }), stats({ runCount: 5 }), criteria).label).toBe('normal')
  })

  it('固定リストジャンルで順位11位(heatRankNormal超)は「低い」になること', () => {
    expect(judgeHeatLabel(target({ rank: 11 }), stats({ runCount: 5 }), criteria).label).toBe('low')
  })

  it('WebSearchジャンル(rank: null)で言及元5件(heatSourcesHigh以上)は「高い」になること', () => {
    expect(judgeHeatLabel(target({ rank: null, strength: 5 }), stats({ runCount: 5 }), criteria).label).toBe('high')
  })

  it('WebSearchジャンルで言及元3件・4件(heatSourcesNormal以上heatSourcesHigh未満)は「普通」になること', () => {
    expect(judgeHeatLabel(target({ rank: null, strength: 3 }), stats({ runCount: 5 }), criteria).label).toBe('normal')
    expect(judgeHeatLabel(target({ rank: null, strength: 4 }), stats({ runCount: 5 }), criteria).label).toBe('normal')
  })

  it('WebSearchジャンルで言及元2件(heatSourcesNormal未満)は「低い」になること', () => {
    expect(judgeHeatLabel(target({ rank: null, strength: 2 }), stats({ runCount: 5 }), criteria).label).toBe('low')
  })

  it('basisがsource-positionになること', () => {
    expect(judgeHeatLabel(target({ rank: 1 }), stats({ runCount: 5 }), criteria).basis).toBe('source-position')
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#注目度ラベル-8、specs/trend-digest/trend-history/requirements.md#注目度ラベル-11
describe('注目度ラベルの判定(judgeHeatLabel) - 過去の観測が十分に貯まっている場合は同じジャンルの分布と比べる', () => {
  it('強さを昇順に並べた三分位で、上側の境目以上なら「高い」になること', () => {
    // N=9件。下側境目=floor(9/3)=3番目(0始まり)=値40、上側境目=floor(18/3)=6番目=値70
    const strengths = [10, 20, 30, 40, 50, 60, 70, 80, 90]
    const result = judgeHeatLabel(target({ strength: 70 }), stats({ runCount: 12, strengths }), criteria)
    expect(result).toEqual({ label: 'high', basis: 'distribution' })
  })

  it('下側の境目未満なら「低い」になること', () => {
    const strengths = [10, 20, 30, 40, 50, 60, 70, 80, 90]
    const result = judgeHeatLabel(target({ strength: 30 }), stats({ runCount: 12, strengths }), criteria)
    expect(result.label).toBe('low')
  })

  it('境目の間なら「普通」になること', () => {
    const strengths = [10, 20, 30, 40, 50, 60, 70, 80, 90]
    const result = judgeHeatLabel(target({ strength: 50 }), stats({ runCount: 12, strengths }), criteria)
    expect(result.label).toBe('normal')
  })

  it('上側と下側の境目が同じ値(分布に幅がない)なら「普通」になること', () => {
    const strengths = [30, 30, 30, 30, 30]
    const result = judgeHeatLabel(target({ strength: 30 }), stats({ runCount: 12, strengths }), criteria)
    expect(result.label).toBe('normal')
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#注目度ラベル-10
describe('注目度ラベルの判定基準の切り替え(judgeHeatLabel) - 実行回数がheatMinObservationRunsに達すると分布に切り替わる', () => {
  it('そのジャンルの実行回数がheatMinObservationRunsちょうどなら分布で決まること', () => {
    const result = judgeHeatLabel(target({ rank: 1 }), stats({ runCount: 12, strengths: [10, 20, 30] }), criteria)
    expect(result.basis).toBe('distribution')
  })

  it('実行回数がheatMinObservationRunsより1回少ないなら情報源での位置で決まること', () => {
    const result = judgeHeatLabel(target({ rank: 1 }), stats({ runCount: 11, strengths: [10, 20, 30] }), criteria)
    expect(result.basis).toBe('source-position')
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#注目度ラベル-8
describe('ジャンルの実行回数の数え方(buildGenreHeatStats) - そのジャンルの観測が1件以上ある実行ログの数で数える', () => {
  function observation(overrides: Partial<Observation> = {}): Observation {
    return {
      genre: 'music',
      title: '話題A',
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

  it('そのジャンルの観測が0件のログ・他ジャンルしかないログは実行回数に数えられないこと', () => {
    const logs: ObservationLog[] = [
      { date: '2026-09-01', edition: 'entertainment', observations: [observation({ genre: 'music' })] },
      { date: '2026-09-08', edition: 'entertainment', observations: [] },
      { date: '2026-09-15', edition: 'entertainment', observations: [observation({ genre: 'anime', method: 'websearch', rank: null })] },
    ]
    const genreStats = buildGenreHeatStats(logs)
    expect(genreStats.get('music')?.runCount).toBe(1)
  })

  it('複数のジャンルの観測が混ざったログでも、ジャンルごとに正しく実行回数が数えられること', () => {
    const logs: ObservationLog[] = [
      {
        date: '2026-09-01',
        edition: 'entertainment',
        observations: [observation({ genre: 'music' }), observation({ genre: 'anime', title: 'アニメA', method: 'websearch', rank: null })],
      },
    ]
    const genreStats = buildGenreHeatStats(logs)
    expect(genreStats.get('music')?.runCount).toBe(1)
    expect(genreStats.get('anime')?.runCount).toBe(1)
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#注目度ラベル-11
describe('分布が同じジャンルの中だけで作られること(buildGenreHeatStats) - 強さの尺度が違う他ジャンル・他方式の観測が混ざらない', () => {
  function observation(overrides: Partial<Observation> = {}): Observation {
    return {
      genre: 'music',
      title: '話題A',
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

  it('固定リストの強さ30とWebSearchの強さ3が同じ分布に入らないこと', () => {
    const logs: ObservationLog[] = [
      {
        date: '2026-09-01',
        edition: 'entertainment',
        observations: [
          observation({ genre: 'music', strength: 30 }),
          observation({ genre: 'sns-buzz', method: 'websearch', rank: null, strength: 3, title: '話題B' }),
        ],
      },
    ]
    const genreStats = buildGenreHeatStats(logs)
    expect(genreStats.get('music')?.strengths).toEqual([30])
    expect(genreStats.get('sns-buzz')?.strengths).toEqual([3])
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#注目度ラベル-12
describe('判定結果に掲載可否を持たせないこと(judgeHeatLabel)', () => {
  it('戻り値がlabel・basisのみを持つこと', () => {
    const result = judgeHeatLabel(target({ rank: 1 }), stats({ runCount: 5 }), criteria)
    expect(Object.keys(result).sort()).toEqual(['basis', 'label'])
  })
})
