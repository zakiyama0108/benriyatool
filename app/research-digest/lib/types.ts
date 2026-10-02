// 記事データの型定義(仕様: specs/research-digest/article-detail/design.md「前提: 記事データの形式」)。
// architecture.md#実装順により、content-selection・content-generationは記事スキーマの型に
// 先行して依存するため、article-detail実装に先立って、その定義どおりの型・定数を置いている
// (article-detail側で追記が必要になった場合は本ファイルに足す)

import { loadGenres } from './genres'

export type Genre = string // genres.jsonのid(例: "medical-health")

// ジャンル順の並び替え・一覧の表示順(genres.jsonの記載順。廃止したジャンルも過去記事の表示用に含む)
export const GENRE_ORDER: Genre[] = loadGenres().map((g) => g.id)
export const GENRE_LABELS: Record<Genre, string> = Object.fromEntries(loadGenres().map((g) => [g.id, g.label]))

// 影響度(content-selection/requirements.md#影響度-1)。配列順=影響度の大きい順。
// 値はプロンプトで指定する値・検証側が受け付ける値と共通で、ここを唯一の正とする
export type Impact = 'high' | 'medium' | 'low'
export const IMPACT_ORDER: Impact[] = ['high', 'medium', 'low']
export const IMPACT_LABELS: Record<Impact, string> = { high: '大', medium: '中', low: '小' }

export type Finding = {
  id: string // 記事内で一意。ジャンルのidと同じ(1ジャンル1本のため)
  genre: Genre
  heading: string
  body: string // 160〜480字(目安200〜400字)
  impact: Impact
  impactReason: string // 影響度の根拠(1文)
  sourceTitle: string // 論文名(公式発表の場合は発表のタイトル)
  sourceName: string // 掲載誌名または発表元
  sourceUrl: string
  doi: string | null
  publishedYear: number | null
  isPreprint: boolean
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
  id: string // ファイル名と一致(= date)
  date: string // YYYY-MM-DD。発行日
  findings: Finding[]
  emptyGenres: EmptyGenre[]
}
