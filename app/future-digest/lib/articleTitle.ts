// 記事タイトルの導出(仕様: content-generation/requirements.md#記事の構成-7、
// content-generation/design.md「記事タイトルを導出する処理」)。
// タイトルはJSONに保存せず、発行日から常に導出する(Claudeには作らせない。表現の揺れ・誇張を避けるため)。
// JSONのタイムゾーン変換に依存しないよう、Dateを介さず文字列を直接分解する
export function buildArticleTitle(date: string): string {
  const [year, month, day] = date.split('-').map((part) => Number(part))
  return `週刊未来予測 ${year}年${month}月${day}日号`
}
