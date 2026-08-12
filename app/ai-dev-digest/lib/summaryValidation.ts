import type { Importance, SummarySection, SummaryPerspective, TopicSummary } from './types'

// 導入文(teaser)の分量検証(仕様: requirements.md#要約-3、design.md「要約の分量を検証する処理」手順2)。
// 「60〜120字程度」の「程度」を、最初に導入した要約分量チェック(目安100〜150字に対し±20字の許容幅)
// と同じ絶対値の許容幅として解釈し、40〜140字を有効範囲とする(要件は許容幅の数値までは定めていないため設計判断)。
export const TEASER_MIN_LENGTH = 40
export const TEASER_MAX_LENGTH = 140

export function isValidTeaserLength(teaser: string): boolean {
  return teaser.length >= TEASER_MIN_LENGTH && teaser.length <= TEASER_MAX_LENGTH
}

// 詳細文(detail)合計の分量検証(仕様: requirements.md#要約-4〜5、design.md「要約の分量を検証する処理」手順1・3)。
// 「1000〜1500字程度」の「程度」を、既存の要約分量チェック(目安100〜150字に対し80〜170字の許容幅=約±20%)
// と同じ比率の許容幅として解釈し、800〜1700字を有効範囲とする(要件は許容幅の数値までは定めていないため設計判断)。
export const DETAIL_TOTAL_MIN_LENGTH = 800
export const DETAIL_TOTAL_MAX_LENGTH = 1700

// 「複数のセクションに分けて構成する」は2件以上を必須とする制約であり、目安とされているのは
// セクションの数(2〜4程度)であって「複数であること」自体は目安ではない(design.md参照)
const MIN_SECTION_COUNT = 2

export function isValidDetailLength(sections: SummarySection[]): boolean {
  if (sections.length < MIN_SECTION_COUNT) return false
  if (
    sections.some(
      (section) => section.heading.length === 0 || section.teaser.length === 0 || section.detail.length === 0
    )
  ) {
    return false
  }

  const totalLength = sections.reduce((sum, section) => sum + section.detail.length, 0)
  return totalLength >= DETAIL_TOTAL_MIN_LENGTH && totalLength <= DETAIL_TOTAL_MAX_LENGTH
}

// 固定4観点(TopicSummary)の分量検証(仕様: requirements.md#要約-2〜5、design.md「要約の分量を検証する処理」手順1〜3)。
// 2026-08追加。4キー(benefit/whatsNew/how/howToUse)がすべて揃っていること、各観点のheading/teaser/detailが
// 空文字でないこと、各観点のteaserが有効範囲(isValidTeaserLengthを再利用)であること、4観点のdetail合計が
// DETAIL_TOTAL_MIN_LENGTH〜DETAIL_TOTAL_MAX_LENGTHの範囲内であることを確認する
const SUMMARY_KEYS = ['benefit', 'whatsNew', 'how', 'howToUse'] as const

export function isValidSummaryDetailLength(summary: TopicSummary): boolean {
  // summaryは呼び出し側でJSON由来の値をキャストして渡す場合があり、型上は必須の4キーが
  // 実行時には欠けている(undefined)ことがあるため、型チェックをすり抜けないよう明示的に確認する
  const perspectives: (SummaryPerspective | undefined)[] = SUMMARY_KEYS.map((key) => summary[key])
  if (perspectives.some((p) => p === undefined)) return false
  if (
    perspectives.some(
      (p) => p!.heading.length === 0 || p!.teaser.length === 0 || p!.detail.length === 0
    )
  ) {
    return false
  }
  if (perspectives.some((p) => !isValidTeaserLength(p!.teaser))) return false

  const totalLength = perspectives.reduce((sum, p) => sum + p!.detail.length, 0)
  return totalLength >= DETAIL_TOTAL_MIN_LENGTH && totalLength <= DETAIL_TOTAL_MAX_LENGTH
}

// 重要度(importance)の検証(仕様: requirements.md#重要度-13)。2026-08追加。1〜5の整数であることを確認する
export function isValidImportance(value: unknown): value is Importance {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
}
