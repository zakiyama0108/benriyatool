// 本文・見出しの検証(仕様: content-generation/requirements.md#要約-3、
// content-generation/design.md「生成結果を検証する処理」)。articleSchema(記事データのビルド時
// バリデーション)・generateContent(生成応答の分類)の両方から呼び出す決定的なロジック。
// 「200〜400字程度」の「程度」を、trend-digestの分量チェックと同じく目安に対し約±20%の許容幅と
// 解釈し、160〜480字を有効範囲とする
export const BODY_MIN_LENGTH = 160
export const BODY_MAX_LENGTH = 480
export const HEADING_MAX_LENGTH = 100

// 固定3観点(when/basis/impact)。この3キー・この順序で固定(requirements.md#要約-3)
const SECTION_KEYS = ['when', 'basis', 'impact'] as const

// headingがnull・空・100字超の場合は不正とする(design.md「生成結果を検証する処理」手順1・3)
export function isValidHeading(heading: unknown): boolean {
  if (typeof heading !== 'string') return false
  if (heading.trim() === '') return false
  return heading.length <= HEADING_MAX_LENGTH
}

// 固定3観点(sections)の完全性・分量を検証する(design.md「生成結果を検証する処理」手順1・2)。
// sectionsがnull・オブジェクトでない・3キーのいずれかが欠落・各観点のheading/textが空文字、
// いずれかに該当すれば不正(false)とする。3観点のtextを連結した文字数が160〜480字の範囲外の場合も不正とする
export function isValidSectionsLength(sections: unknown): boolean {
  if (typeof sections !== 'object' || sections === null) return false
  const record = sections as Record<string, { heading?: unknown; text?: unknown } | undefined>

  const values = SECTION_KEYS.map((key) => record[key])
  if (values.some((v) => v === undefined)) return false
  if (
    values.some(
      (v) =>
        typeof v!.heading !== 'string' ||
        v!.heading.trim() === '' ||
        typeof v!.text !== 'string' ||
        v!.text.trim() === ''
    )
  ) {
    return false
  }

  const totalLength = values.reduce((sum, v) => sum + (v!.text as string).length, 0)
  return totalLength >= BODY_MIN_LENGTH && totalLength <= BODY_MAX_LENGTH
}
