// 本文・見出しの検証(仕様: content-generation/requirements.md#要約-2〜3、
// content-generation/design.md「生成結果を検証する処理」)。articleSchema(記事データのビルド時検証)・
// generateContent(生成応答の分類)の両方から呼び出す決定的なロジック。「200〜400字程度」の「程度」を、
// 目安に対し約±20%の許容幅と解釈し、160〜480字を有効範囲とする(future-digest・trend-digestと同じ)
export const BODY_MIN_LENGTH = 160
export const BODY_MAX_LENGTH = 480
export const HEADING_MAX_LENGTH = 100

// 旧形式(LegacyFinding)のbody用の分量検証。この機能(固定4観点)より前に公開した記事データを
// articleSchema.tsがビルド時に検証する際に使う(article-detail/design.md「バリデーション」の
// 「旧形式(bodyを持つ)の場合」。過去記事を書き換えずそのまま表示し続けるため、新形式向けの
// isValidSectionsLengthへ完全に置き換えず残している)。
// bodyがnull・空文字・文字列以外の場合も不正とする(取得困難時に返る{ heading: null, body: null }を
// 失敗シグナルとして判定するため)
export function isValidBodyLength(body: unknown): boolean {
  if (typeof body !== 'string') return false
  if (body.length === 0) return false
  return body.length >= BODY_MIN_LENGTH && body.length <= BODY_MAX_LENGTH
}

// headingがnull・空・100字超の場合は不正とする(design.md「生成結果を検証する処理」手順1・3)
export function isValidHeading(heading: unknown): boolean {
  if (typeof heading !== 'string') return false
  if (heading.trim() === '') return false
  return heading.length <= HEADING_MAX_LENGTH
}

// 本文に「査読」という語が含まれるか(design.md「生成結果を検証する処理」手順4)。
// 査読前の論文で、査読前であることの明記を機械的に最低限確かめるために使う。呼び出し元は
// 固定4観点のtextを連結した文字列を渡す(新形式では単一のbodyを持たないため)
export function mentionsPreprint(body: string): boolean {
  return body.includes('査読')
}

// 新形式(CurrentFinding)のsections用の分量検証(仕様: content-generation/design.md
// 「生成結果を検証する処理」手順1・2)。finding/basis/relevance/caveatの4キーすべてを持ち、
// 各観点のheading/textが空文字でなく、4観点のtextを連結した文字数が160〜480字であることを
// 確認する(news-digestのisValidSummaryDetailLengthと同じ考え方)
const SECTION_KEYS = ['finding', 'basis', 'relevance', 'caveat'] as const

export function isValidSectionsLength(sections: unknown): boolean {
  if (typeof sections !== 'object' || sections === null) return false
  const record = sections as Record<string, { heading?: unknown; text?: unknown } | undefined>
  const values = SECTION_KEYS.map((key) => record[key])
  if (values.some((v) => v === undefined)) return false
  if (
    values.some(
      (v) => typeof v!.heading !== 'string' || v!.heading.trim() === '' || typeof v!.text !== 'string' || v!.text.trim() === '',
    )
  ) {
    return false
  }
  const totalLength = values.reduce((sum, v) => sum + (v!.text as string).length, 0)
  return totalLength >= BODY_MIN_LENGTH && totalLength <= BODY_MAX_LENGTH
}
