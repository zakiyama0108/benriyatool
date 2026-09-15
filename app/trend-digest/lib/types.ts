// 記事データの型定義(仕様: design.md「前提: 記事データの形式」)。
// 記事本文はDBではなくcontent/trend-digest/articles/<id>.jsonとして管理する
// (architecture.md#3-設計方針)。article-list・content-selection・content-generation・
// weekly-publish・line-broadcast・source-reviewはこの形式を共通して参照する

export type Edition = 'entertainment' | 'culture-lifestyle'

export type Genre =
  | 'music' | 'japanese-movie' | 'foreign-movie' | 'japanese-drama' | 'foreign-drama'
  | 'anime' | 'variety' | 'streaming-video' | 'books-comics'
  | 'sns-buzz' | 'buzzwords' | 'gourmet' | 'hobby' | 'fashion'
  | 'gadgets' | 'games' | 'travel' | 'economy-money'

// ジャンルの表示順(edition内の見出し表示順として使う。requirements.md#グループとジャンル)
export const GENRE_ORDER: Record<Edition, Genre[]> = {
  entertainment: ['music', 'japanese-movie', 'foreign-movie', 'japanese-drama', 'foreign-drama', 'anime', 'variety', 'streaming-video', 'books-comics'],
  'culture-lifestyle': ['sns-buzz', 'buzzwords', 'gourmet', 'hobby', 'fashion', 'gadgets', 'games', 'travel', 'economy-money'],
}

// ジャンル見出しに表示する日本語ラベル(GenreSectionが使う。requirements.md#グループとジャンルの表記をそのまま使う)
export const GENRE_LABELS: Record<Genre, string> = {
  music: '音楽',
  'japanese-movie': '日本映画',
  'foreign-movie': '海外映画',
  'japanese-drama': '日本ドラマ',
  'foreign-drama': '海外ドラマ',
  anime: 'アニメ',
  variety: 'バラエティ',
  'streaming-video': 'サブスク動画',
  'books-comics': '書籍・漫画',
  'sns-buzz': 'SNSバズり',
  buzzwords: '流行りの言葉',
  gourmet: 'グルメ',
  hobby: '流行りの趣味',
  fashion: 'ファッション',
  gadgets: 'ガジェット・家電',
  games: 'ゲーム',
  travel: '旅行・観光',
  'economy-money': '経済・お金',
}

export type Topic = {
  id: string // 記事内で一意。フィードバックの紐付けに使う(例: "topic-1")
  genre: Genre
  heading: string // content-generationが生成する見出し
  body: string // content-generationが生成する本文(160〜480字、目安200〜400字)
  sourceTitle: string // 対象作品・話題の原題(content-selectionのCandidate.titleをそのまま引き継ぐ。掲載済み話題の再掲抑制の突合キーとして使う。表示はしない)
  sourceName: string // 出典の情報源名
  sourceUrl: string // 出典の元URL
}

export type Article = {
  id: string // ファイル名と一致
  edition: Edition
  date: string // YYYY-MM-DD。発行日
  topics: Topic[] // ジャンルの定義順(GENRE_ORDER)に並ぶ。1〜10件
}
