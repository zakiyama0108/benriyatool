// 記事データの型定義(仕様: specs/research-digest/article-detail/design.md「前提: 記事データの形式」)。
// architecture.md#実装順により、content-selection・content-generationは記事スキーマの型に
// 先行して依存するため、article-detail実装に先立って、その定義どおりの型・定数を置いている
// (article-detail側で追記が必要になった場合は本ファイルに足す)

import { loadGenres, EDITION_GENRES as GENRES_EDITION_GENRES, type Edition } from './genres'

export type Genre = string // genres.jsonのid(例: "medical-health")

// ジャンル順の並び替え・一覧の表示順(genres.jsonの記載順。廃止したジャンルも過去記事の表示用に含む)
export const GENRE_ORDER: Genre[] = loadGenres().map((g) => g.id)
export const GENRE_LABELS: Record<Genre, string> = Object.fromEntries(loadGenres().map((g) => [g.id, g.label]))

// 編(仕様: content-selection/requirements.md#編成とジャンルの割り当て-1〜2)。genres.jsonのedition
// 属性(genres.tsが検証・集計済み)をそのまま再公開する。EDITION_LABELSは記事タイトル・一覧の編バッジ等、
// 読者向け表示の日本語ラベル
export type { Edition }
export const EDITION_GENRES: Record<Edition, Genre[]> = GENRES_EDITION_GENRES
export const EDITION_LABELS: Record<Edition, string> = {
  'body-life': 'からだ・くらし編',
  'science-society': '科学・社会編',
}

// 影響度(content-selection/requirements.md#影響度-1)。配列順=影響度の大きい順。
// 値はプロンプトで指定する値・検証側が受け付ける値と共通で、ここを唯一の正とする
export type Impact = 'high' | 'medium' | 'low'
export const IMPACT_ORDER: Impact[] = ['high', 'medium', 'low']
export const IMPACT_LABELS: Record<Impact, string> = { high: '大', medium: '中', low: '小' }

// 図解(news-digest/article-detail/design.mdの前提: 記事データの形式と同一の形。
// content-generation/requirements.md#図解-6)。エージェントが書いたMermaid記法の文字列をそのまま
// 保存し、レンダリングはクライアント側のMermaidライブラリ(DiagramView)に委ねる(2026-10改定:
// 画像による図解(AI画像生成→コードでのアイコン図SVG描画)も試みたが、いずれも求める品質を満たせなかった
// ため、画像による図解は行わないことにし、Mermaid図のみを図解として扱う)
export type Diagram = { type: 'mermaid'; code: string }

export type FindingSection = {
  heading: string // 結論文(短い見出し)
  text: string // 本文
  diagram: Diagram | null
}

// 固定4観点。この4キー・この順序で固定(content-generation/requirements.md#要約-3)
export type FindingSections = {
  finding: FindingSection // 何が分かったか
  basis: FindingSection // なぜそう結論づけられたのか
  relevance: FindingSection // 暮らしへの関わり
  caveat: FindingSection // 注意点
}

export const SECTION_LABELS: Record<keyof FindingSections, string> = {
  finding: '何が分かったか',
  basis: 'なぜそう結論づけられたのか',
  relevance: '暮らしへの関わり',
  caveat: '注意点',
}

type FindingBase = {
  id: string // 記事内で一意。ジャンルのidと同じ(1ジャンル1本のため)
  genre: Genre
  heading: string
  impact: Impact
  impactReason: string // 影響度の根拠(1文)
  sourceTitle: string // 論文名(公式発表の場合は発表のタイトル)
  sourceName: string // 掲載誌名または発表元
  sourceUrl: string
  doi: string | null
  publishedYear: number | null
  isPreprint: boolean
}

// この機能(固定4観点・図解)より前に公開した記事が持つ形(単一のbody文字列)。
// 過去記事を書き換えずそのまま表示し続けるため、新形式と並存させる
// (article-detail/requirements.md#運営者向けフィードバック-14、trend-digest/future-digestと同じ設計判断)
export type LegacyFinding = FindingBase & {
  body: string // 160〜480字(目安200〜400字)
}

// この機能以降に生成する記事が持つ形
export type CurrentFinding = FindingBase & {
  sections: FindingSections
}

export type Finding = LegacyFinding | CurrentFinding

// FindingがLegacyFinding(旧形式)かどうかを判定する型ガード。`body`キーの有無で判定する
// (CurrentFindingは`sections`キーを持ち`body`キーを持たないため、互いに排他。ai-dev-digestの
// isLegacyTopicと同じ考え方)
export function isLegacyFinding(finding: Finding): finding is LegacyFinding {
  return 'body' in finding
}

// 掲載できなかったジャンル。reasonで表示文言を出し分ける
export type EmptyGenre = {
  genre: Genre
  reason: 'no-candidate' | 'collection-failed' | 'generation-failed'
  collectionFailureReason?: 'timeout' | 'invalid-format' | 'other' // reasonが'collection-failed'の場合のみ
}

// 収集失敗の分類ラベルの読者向け表示。内部のコード値は変えず、表示文言だけを読者に分かる言葉にする
export const COLLECTION_FAILURE_LABELS: Record<NonNullable<EmptyGenre['collectionFailureReason']>, string> = {
  timeout: '調査が時間内に終わりませんでした',
  'invalid-format': '調査結果を正しく読み取れませんでした',
  other: '調査中にエラーが発生しました',
}

export type Article = {
  id: string // ファイル名と一致(= `<date>-<edition>`。trend-digestと同じ形式。weekly-publish/design.md「決定事項」)
  edition: Edition // どちらの編の記事か
  date: string // YYYY-MM-DD。発行日
  findings: Finding[]
  emptyGenres: EmptyGenre[]
}
