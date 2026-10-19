// 続報(報告回数2回目以降)の「なぜ注目されたか」観点が、前回掲載時の同観点と完全に同一かどうかを
// 判定する(仕様: content-generation/requirements.md#エージェントの逸脱防止-7、content-generation/
// design.md「本文の分量を検証する処理」手順3)。固定3観点への移行前はbody全体同士を比較していたが
// (旧app/trend-digest/lib/bodyValidation.tsのisDuplicateOfLastPublishedBody)、観点ごとの固定ラベル
// 表示への移行に合わせて比較対象をreason.textのみに変更したもの(tasks.md Task8)。
// 前後の空白の差異だけで判定をすり抜けないよう、両者をtrimしてから比較する。
// 表現を変えただけの実質的な重複(言い換え)までは判定できない(意味の重複判定はコードでは
// 決定的に行えないため、最終防波堤として完全一致のみを弾く設計判断。design.md参照)
export function isDuplicateOfLastPublishedReason(reason: string, lastPublishedReason: string | null): boolean {
  if (lastPublishedReason === null) return false
  return reason.trim() === lastPublishedReason.trim()
}
