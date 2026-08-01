import type { SummarySection } from './types'

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
