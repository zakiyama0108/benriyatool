import type { SummarySection } from './types'

// 要約(sections合計)の分量検証(仕様: requirements.md#要約-2〜3、design.md「要約の分量を検証する処理」)。
// 「1000〜1500字程度」の「程度」を、既存の要約分量チェック(目安100〜150字に対し80〜170字の許容幅=約±20%)
// と同じ比率の許容幅として解釈し、800〜1700字を有効範囲とする(要件は許容幅の数値までは定めていないため設計判断)。
export const SUMMARY_TOTAL_MIN_LENGTH = 800
export const SUMMARY_TOTAL_MAX_LENGTH = 1700

// 「複数のセクションに分けて構成する」は2件以上を必須とする制約であり、目安とされているのは
// セクションの数(2〜4程度)であって「複数であること」自体は目安ではない(design.md参照)
const MIN_SECTION_COUNT = 2

export function isValidSummaryLength(sections: SummarySection[]): boolean {
  if (sections.length < MIN_SECTION_COUNT) return false
  if (sections.some((section) => section.heading.length === 0 || section.body.length === 0)) return false

  const totalLength = sections.reduce((sum, section) => sum + section.body.length, 0)
  return totalLength >= SUMMARY_TOTAL_MIN_LENGTH && totalLength <= SUMMARY_TOTAL_MAX_LENGTH
}
