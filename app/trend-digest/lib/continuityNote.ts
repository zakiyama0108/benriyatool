// 見出し・本文生成プロンプトに添える、継続度・注目度の事実情報と続報の情報を組み立てる
// (仕様: content-generation/design.md「見出し・本文を書く処理」手順6-7、
// requirements.md#エージェントの逸脱防止-6、#続報の執筆-7〜8)。
// 純粋関数のため、scripts/trend-digest/generate-content.tsから切り出してテストする
import type { SelectedTopic } from './candidateTypes'
import { DURATION_LABELS, HEAT_LABELS } from './types'

// 初掲載を含む全候補に、trend-historyが判定した継続度ラベル・注目度ラベル・継続日数・報告回数・地域を
// 事実として渡す(本文でそれと異なる段階・強さ・期間・地域を書かせないため)。報告回数2回目以降(続報)の
// 候補にだけ、前回からの変化を書くための直近掲載時の継続度ラベルと前回の本文を加える
// (前回の言い換えで終わらせないため。機械検知はgenerateContent.tsのclassifyGenerationResultが行う)
export function buildContinuityNote(candidate: SelectedTopic): string {
  const origin = candidate.originRegion ?? '不明'
  const current = candidate.currentRegions.length > 0 ? candidate.currentRegions.join('、') : '不明'
  const facts = `
# 継続度・注目度の情報(事実として扱い、異なる段階・強さ・期間・地域を本文に書かないこと。requirements.md#エージェントの逸脱防止-6)
- 通算の報告回数: ${candidate.reportCount}回目
- 継続度ラベル: ${DURATION_LABELS[candidate.durationLabel]}
- 注目度ラベル: ${HEAT_LABELS[candidate.heatLabel]}
- 継続日数: ${candidate.continuationDays}日
- 発祥地域: ${origin}
- 現在の主な流行地域: ${current}`

  if (candidate.reportCount < 2) return facts

  const lastLabel = candidate.lastPublishedDurationLabel ? DURATION_LABELS[candidate.lastPublishedDurationLabel] : '不明'
  return `${facts}

# 続報の情報(この話題は過去にも掲載済みです。requirements.md#続報の執筆-7〜8)
- 直近掲載時の継続度ラベル: ${lastLabel}
- 前回掲載時の本文: ${candidate.lastPublishedBody ?? '(取得できませんでした)'}

本文は、前回掲載時の本文をそのまま言い換えるのではなく、前回から何が変わったか(継続度ラベルの進行・継続期間の伸び・注目度の変化)を軸に書いてください。前回の記事を読んでいない読者にも通じるよう、話題そのものの最小限の説明も含めてください。`
}
