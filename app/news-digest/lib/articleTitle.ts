// 記事タイトルの導出(仕様: content-generation/requirements.md#記事の構成-11、
// content-generation/design.md「記事タイトルを導出する処理」)。エージェントに毎回自由生成させると
// 誇張表現・話題の先取りのリスクがあるため、日付(週の代表日、月曜始まりの週で公開日=水曜)から
// 一意に決まる固定テンプレートで生成する。JSONのタイムゾーン変換に依存しないよう、Dateを介さず
// 文字列を直接分解する(ai-dev-digestのarticleTitle.tsと同じ設計判断)。
//
// このファイルの実装・テストの管轄はcontent-generation spec(本ブランチ作成時点で未実装)だが、
// article-detailのページ表示(requirements.md#記事本文表示-1)に必須のため、article-detail側で
// 先行して作成する。content-generation実装時にこのファイルと重複作成しないよう確認すること
// (article-detail/design.md「関連するファイル(抜粋)」参照)
export function buildArticleTitle(date: string): string {
  const [year, month, day] = date.split('-').map((part) => Number(part))
  return `${year}年${month}月${day}日週の重要ニュース`
}
