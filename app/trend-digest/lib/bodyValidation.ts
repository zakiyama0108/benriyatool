// 本文(固定3観点)の分量検証(仕様: content-generation/requirements.md#要約-2、content-generation/design.md
// 「本文の分量を検証する処理」)。articleSchema(記事データのビルド時バリデーション)・
// generateContent(生成応答の分類)の両方から呼び出す決定的なロジック。
// 「200〜400字程度」の「程度」を、ai-dev-digestの分量チェック(目安に対し約±20%の許容幅)と
// 同じ考え方で解釈し、160〜480字を有効範囲とする(要件は許容幅の数値までは定めていないため設計判断)
export const BODY_MIN_LENGTH = 160
export const BODY_MAX_LENGTH = 480

const SECTION_KEYS = ['fact', 'reason', 'caveat'] as const

// sectionsが固定3観点(fact/reason/caveat、各{heading, text})として妥当か、かつ3観点の
// textを連結した文字数が160〜480字の範囲かを判定する(仕様: content-generation/design.md
// 「本文の分量を検証する処理」手順1〜2)。sectionsがnull・オブジェクト以外、いずれかの観点が
// 欠落、またはheading/textが空文字の場合は不正とする(エージェントが取得困難時に返す
// { heading: null, sections: null } を失敗シグナルとして判定するため)
export function isValidSectionsLength(sections: unknown): boolean {
  if (typeof sections !== 'object' || sections === null) return false
  const record = sections as Record<string, unknown>

  let totalLength = 0
  for (const key of SECTION_KEYS) {
    const section = record[key]
    if (typeof section !== 'object' || section === null) return false
    const { heading, text } = section as Record<string, unknown>
    if (typeof heading !== 'string' || heading.trim() === '') return false
    if (typeof text !== 'string' || text.trim() === '') return false
    totalLength += text.length
  }

  return totalLength >= BODY_MIN_LENGTH && totalLength <= BODY_MAX_LENGTH
}
