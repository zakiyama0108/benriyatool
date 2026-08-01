// 要約の文字数検証(仕様: requirements.md#要約-2、design.md「要約の文字数を検証する処理」)。
// 「100〜150字程度」の「程度」を±20字の許容幅として解釈し、80〜170字を有効範囲とする
// (要件は許容幅の数値までは定めていないため設計判断)。
export const SUMMARY_MIN_LENGTH = 80
export const SUMMARY_MAX_LENGTH = 170

export function isValidSummaryLength(summary: string): boolean {
  return summary.length >= SUMMARY_MIN_LENGTH && summary.length <= SUMMARY_MAX_LENGTH
}
