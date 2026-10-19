// 5アプリ共通の表示行の型(仕様: design.md#処理フロー「アプリごとの表示行を組み立てる処理」)。
// 各アプリの変換関数(buildAiDevDigestSources等)はこの型に変換するだけで、別の正規形へ
// データを揃え直すことはしない(design.md決定事項「5アプリのデータ形状差への対応」)

export type SourceDirectoryRow = {
  genreLabel: string
  // 編の区別を持つアプリ(現時点ではtrend-digestのみ)だけが値を持つ。編の区別がない
  // アプリ(ai-dev-digest/news-digest/future-digest/research-digest)はundefinedのまま
  // で、SourceTable側が編列自体の表示有無を切り替える(design.md決定事項「編(edition)列の表示判定」)
  editionLabel?: string
  methodLabel: string
  criteriaText: string
  sources: Array<{ name: string; url: string; regionLabel?: string }>
  searchHints: string[]
}
