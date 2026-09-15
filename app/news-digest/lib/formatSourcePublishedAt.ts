// 出典(元記事)の投稿日時をJSTの日付表示に整形する(仕様: design.md「その週の記事本文を
// 表示する処理」手順2)。時刻は表示しない(ダイジェスト自体が週次更新のため、出典の時刻まで
// 表示する必要性が薄い。ai-dev-digestのformatSourcePublishedAt.tsと同じ設計判断)
const FORMATTER = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export function formatSourcePublishedAt(iso: string): string {
  return FORMATTER.format(new Date(iso))
}
