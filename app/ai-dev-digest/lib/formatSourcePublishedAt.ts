// 出典(元記事・動画)の投稿日時をJSTの日付表示に整形する(仕様: article-detail/design.md
// 「その日の記事本文を表示する処理」手順2)。時刻は表示しない(ダイジェスト自体が日次更新のため、
// 出典の時刻まで表示する必要性が薄く、buildArticleTitleの日付粒度と合わせた)
const FORMATTER = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

export function formatSourcePublishedAt(iso: string): string {
  return FORMATTER.format(new Date(iso))
}
