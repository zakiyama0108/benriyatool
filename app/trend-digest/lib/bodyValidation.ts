// 本文の分量検証(仕様: content-generation/requirements.md#要約-2、content-generation/design.md
// 「本文の分量を検証する処理」)。articleSchema(記事データのビルド時バリデーション)・
// generateContent(生成応答の分類)の両方から呼び出す決定的なロジック。
// 「200〜400字程度」の「程度」を、ai-dev-digestの分量チェック(目安に対し約±20%の許容幅)と
// 同じ考え方で解釈し、160〜480字を有効範囲とする(要件は許容幅の数値までは定めていないため設計判断)
export const BODY_MIN_LENGTH = 160
export const BODY_MAX_LENGTH = 480

// bodyがnull・空文字・文字列以外の場合も不正とする(エージェントが取得困難時に返す
// { heading: null, body: null } を失敗シグナルとして判定するため)
export function isValidTopicBodyLength(body: unknown): boolean {
  if (typeof body !== 'string') return false
  if (body.length === 0) return false
  return body.length >= BODY_MIN_LENGTH && body.length <= BODY_MAX_LENGTH
}

// 続報(報告回数2回目以降)の本文が、前回掲載時の本文と完全に同一かどうかを判定する(仕様:
// requirements.md#エージェントの逸脱防止-7、design.md「本文の分量を検証する処理」手順3)。
// 前後の空白の差異だけで判定をすり抜けないよう、両者をtrimしてから比較する。
// 表現を変えただけの実質的な重複(言い換え)までは判定できない(意味の重複判定はコードでは
// 決定的に行えないため、最終防波堤として完全一致のみを弾く設計判断。design.md参照)
export function isDuplicateOfLastPublishedBody(body: string, lastPublishedBody: string | null): boolean {
  if (lastPublishedBody === null) return false
  return body.trim() === lastPublishedBody.trim()
}
