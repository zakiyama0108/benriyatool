import type { Genre } from './types'
import type { HeatLabel, HistoryCriteria, ObservationLog } from './historyTypes'

// 注目度ラベルの判定(仕様: requirements.md#注目度ラベル-8〜12、design.md「注目度ラベルを判定する処理」)。
// そのジャンルの過去の観測が十分に貯まっている(実行回数がheatMinObservationRuns以上)場合は
// 分布の三分位で、そうでない場合は情報源での位置(固定リストは順位、WebSearchは独立言及元数)で決める

// ラベル判定の対象(集約した系列の直近の観測)。rankがnullならWebSearchジャンルとして扱う
export type HeatLabelTarget = {
  rank: number | null
  strength: number
}

// ジャンル1つ分の、注目度判定に使う分布・実行回数(design.md「注目度ラベルを判定する処理」手順1〜2、
// 「パフォーマンス」。話題ごとに全ログを走査し直さないよう、呼び出し側が1度だけ組み立てて使い回す)
export type GenreHeatStats = {
  runCount: number // そのジャンルの観測が1件以上ある実行ログの数
  strengths: number[] // そのジャンルの全観測の強さ(今回の観測を含む)
}

export type HeatLabelResult = {
  label: HeatLabel
  basis: 'distribution' | 'source-position' // 注目度をどちらの方法で決めたか(design.md「ログ」)
}

function judgeBySourcePosition(target: HeatLabelTarget, criteria: HistoryCriteria): HeatLabel {
  if (target.rank !== null) {
    if (target.rank <= criteria.heatRankHigh) return 'high'
    if (target.rank <= criteria.heatRankNormal) return 'normal'
    return 'low'
  }
  if (target.strength >= criteria.heatSourcesHigh) return 'high'
  if (target.strength >= criteria.heatSourcesNormal) return 'normal'
  return 'low'
}

// そのジャンルの全観測の強さを昇順に並べた三分位で決める(design.md手順2)。
// 件数をNとしたとき、下側の境目を昇順の並びのfloor(N÷3)番目(0始まり)の値、
// 上側の境目をfloor(N×2÷3)番目の値とする。境目が同じ値(分布に幅がない)なら「普通」とする
function judgeByDistribution(target: HeatLabelTarget, strengths: number[]): HeatLabel {
  const sorted = [...strengths].sort((a, b) => a - b)
  const n = sorted.length
  const lowerBoundary = sorted[Math.floor(n / 3)]
  const upperBoundary = sorted[Math.floor((n * 2) / 3)]
  if (upperBoundary === lowerBoundary) return 'normal'
  if (target.strength >= upperBoundary) return 'high'
  if (target.strength < lowerBoundary) return 'low'
  return 'normal'
}

export function judgeHeatLabel(
  target: HeatLabelTarget,
  genreStats: GenreHeatStats,
  criteria: HistoryCriteria
): HeatLabelResult {
  if (genreStats.runCount >= criteria.heatMinObservationRuns) {
    return { label: judgeByDistribution(target, genreStats.strengths), basis: 'distribution' }
  }
  return { label: judgeBySourcePosition(target, criteria), basis: 'source-position' }
}

// 全観測ログから、ジャンルごとの実行回数・強さの分布を1度だけ組み立てる(design.md「パフォーマンス」)。
// 実行回数は「そのジャンルの観測が1件以上ある実行ログの数」で数える(design.md手順1)
export function buildGenreHeatStats(logs: ObservationLog[]): Map<Genre, GenreHeatStats> {
  const result = new Map<Genre, GenreHeatStats>()
  for (const log of logs) {
    const genresInThisLog = new Set(log.observations.map((o) => o.genre))
    for (const genre of genresInThisLog) {
      if (!result.has(genre)) result.set(genre, { runCount: 0, strengths: [] })
      result.get(genre)!.runCount += 1
    }
    for (const obs of log.observations) {
      result.get(obs.genre)!.strengths.push(obs.strength)
    }
  }
  return result
}
