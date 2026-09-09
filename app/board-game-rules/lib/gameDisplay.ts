// ゲーム情報の表示整形。Supabaseに触れない純粋関数のため、`lib/games.ts`(supabaseClientを
// 読み込む)とは分け、表示コンポーネントから直接使えるようにする(admin/lib/draftPreview.tsと同じ考え方)。

// 対応人数・プレイ時間の範囲表示を組み立てる(仕様: game-detail/design.md「分類情報を表示する処理」)。
// 下限=上限のときは1つだけ表示する。両方NULL(未登録)ならnullを返し、呼び出し側で表示要否を判断する。
// 片方だけ登録されている場合はその値だけを表示する(範囲の片側だけでも情報として出す)。
export function formatRange(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null
  if (min == null) return `${max}`
  if (max == null) return `${min}`
  return min === max ? `${min}` : `${min}〜${max}`
}
