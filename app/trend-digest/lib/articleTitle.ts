import type { Edition } from './types'

// 記事タイトルの導出(仕様: content-generation/requirements.md#記事の構成-6、
// content-generation/design.md「記事タイトルを導出する処理」)。
// article-detail(記事詳細ページ)がこの関数の呼び出し元であるため、本ファイルはarticle-detailの
// 実装として先行作成する(ownerはcontent-generation。content-generationの実装時にこのファイルを
// 再作成せず、そのまま再利用すること)。
// エージェントに毎回自由生成させると誇張表現・話題の先取りのリスクがあるため、edition・日付から
// 一意に決まる固定テンプレートで生成する。JSONのタイムゾーン変換に依存しないよう、Dateを介さず
// 文字列を直接分解する
const EDITION_LABELS: Record<Edition, string> = {
  entertainment: 'エンタメ編',
  'culture-lifestyle': 'カルチャー編',
}

export function buildArticleTitle(edition: Edition, date: string): string {
  const [year, month, day] = date.split('-').map((part) => Number(part))
  return `週刊トレンド ${EDITION_LABELS[edition]} ${year}年${month}月${day}日号`
}
