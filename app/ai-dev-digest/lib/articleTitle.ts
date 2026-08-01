// 記事タイトルの導出(仕様: requirements.md#記事の構成-5、design.md「記事タイトルを導出する処理」)。
// エージェントに毎回自由生成させると誇張表現・話題の先取りのリスクがあるため、
// 日付(YYYY-MM-DD)から一意に決まる固定テンプレートで生成する。JSONのタイムゾーン変換に
// 依存しないよう、Dateを介さず文字列を直接分解する
export function buildArticleTitle(date: string): string {
  const [year, month, day] = date.split('-').map((part) => Number(part))
  return `${year}年${month}月${day}日のAIニュース`
}
