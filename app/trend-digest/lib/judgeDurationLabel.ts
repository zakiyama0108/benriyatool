import type { DurationLabel, HistoryCriteria } from './historyTypes'

// 継続度ラベルの判定(仕様: requirements.md#継続度ラベル-1〜7、design.md「継続度ラベルを判定する処理」)。
// 途切れずに検知され続けている期間(continuationDays)のみから決まり、採用基準を満たしたかどうかとは
// 独立している。判定に使う日数はcriteria.jsonのhistoryから読み、コードに直書きしない
// (requirements.md#スコープ外「日数の区切りの動的な自動チューニングは行わず、人間が見直す」に対応するため)
export function judgeDurationLabel(continuationDays: number, criteria: HistoryCriteria): DurationLabel {
  if (continuationDays >= criteria.highlyTalkedMinDays) return 'highly-talked'
  if (continuationDays >= criteria.talkedMinDays) return 'talked'
  if (continuationDays >= criteria.emergingMinDays) return 'emerging'
  return 'pre-trend'
}
