// 本文・見出しの検証(仕様: content-generation/requirements.md#要約-3、
// content-generation/design.md「生成結果を検証する処理」)。articleSchema(article-detail実装時に
// 記事データのビルド時バリデーションへ組み込む)・generateContent(生成応答の分類)の両方から
// 呼び出す決定的なロジック。「200〜400字程度」の「程度」を、trend-digestの分量チェックと同じく
// 目安に対し約±20%の許容幅と解釈し、160〜480字を有効範囲とする
export const BODY_MIN_LENGTH = 160
export const BODY_MAX_LENGTH = 480
export const HEADING_MAX_LENGTH = 100

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
