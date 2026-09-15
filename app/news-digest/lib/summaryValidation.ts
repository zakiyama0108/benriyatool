import type { Importance, TopicSummary } from './types'

// 要約(固定4観点)・重要度の分量検証(仕様: requirements.md#要約-2〜3、requirements.md#重要度-8、
// design.md「要約の分量を検証する処理」)。articleSchema.ts(article-detailのビルド時バリデーション)・
// generateContent.ts(エージェントの生成結果の利用可否判定)の双方から呼び出し、許容幅の数値を
// このファイルに一本化する(表記ゆれ・二重定義による将来的な乖離を防ぐ)

// 「60〜120字程度」の「程度」を、ai-dev-digest/trend-digestの要約分量チェックと同じ絶対値の許容幅
// (目安に対し±20字)として解釈し、40〜140字を有効範囲とする(要件は許容幅の数値までは定めていないため設計判断。
// design.md「要約の分量を検証する処理」手順2)
export const TEASER_MIN_LENGTH = 40
export const TEASER_MAX_LENGTH = 140

export function isValidTeaserLength(teaser: string): boolean {
  return teaser.length >= TEASER_MIN_LENGTH && teaser.length <= TEASER_MAX_LENGTH
}

// 「1000〜1500字程度」の「程度」を、同じ考え方(目安に対し約±20%)の許容幅として解釈し、
// 800〜1700字を有効範囲とする(design.md「要約の分量を検証する処理」手順3)
export const DETAIL_TOTAL_MIN_LENGTH = 800
export const DETAIL_TOTAL_MAX_LENGTH = 1700

// 固定4観点。この4キー・この順序で固定(requirements.md#要約-4)
const SUMMARY_KEYS = ['whatHappened', 'whyItMatters', 'background', 'outlook'] as const

// 要約(固定4観点)の完全性・分量検証(design.md「要約の分量を検証する処理」手順1・3)。
// summaryがnull・オブジェクトでない・4キーのいずれかが欠落・各観点のheading/teaser/detailが
// 空文字・teaserが有効範囲外・detail合計が有効範囲外、いずれかに該当すれば不正(false)とする
export function isValidSummaryDetailLength(summary: unknown): summary is TopicSummary {
  if (typeof summary !== 'object' || summary === null) return false
  const record = summary as Record<string, { heading?: unknown; teaser?: unknown; detail?: unknown } | undefined>
  const perspectives = SUMMARY_KEYS.map((key) => record[key])
  if (perspectives.some((p) => p === undefined)) return false
  if (
    perspectives.some(
      (p) =>
        typeof p!.heading !== 'string' ||
        p!.heading.trim() === '' ||
        typeof p!.teaser !== 'string' ||
        p!.teaser.trim() === '' ||
        typeof p!.detail !== 'string' ||
        p!.detail.trim() === ''
    )
  ) {
    return false
  }
  if (perspectives.some((p) => !isValidTeaserLength(p!.teaser as string))) return false

  const totalLength = perspectives.reduce((sum, p) => sum + (p!.detail as string).length, 0)
  return totalLength >= DETAIL_TOTAL_MIN_LENGTH && totalLength <= DETAIL_TOTAL_MAX_LENGTH
}

// 重要度(importance)の検証(requirements.md#重要度-8)。1〜5の整数であることを確認する
export function isValidImportance(value: unknown): value is Importance {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
}
