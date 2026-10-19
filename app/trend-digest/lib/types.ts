// 記事データの型定義(仕様: design.md「前提: 記事データの形式」)。
// 記事本文はDBではなくcontent/trend-digest/articles/<id>.jsonとして管理する
// (architecture.md#3-設計方針)。article-list・content-selection・content-generation・
// weekly-publish・line-broadcast・source-reviewはこの形式を共通して参照する

import type { DurationLabel, HeatLabel } from './historyTypes' // trend-history/design.mdが定義する継続度ラベル・注目度ラベル

export type Edition = 'entertainment' | 'culture-lifestyle'

export type Genre =
  | 'music' | 'japanese-movie' | 'foreign-movie' | 'japanese-drama' | 'foreign-drama'
  | 'anime' | 'variety' | 'streaming-video' | 'books-comics'
  | 'sns-buzz' | 'buzzwords' | 'gourmet' | 'hobby' | 'fashion'
  | 'gadgets' | 'games' | 'travel' | 'economy-money' | 'dev-trends'

// ジャンルの表示順(edition内の見出し表示順として使う。requirements.md#グループとジャンル)
export const GENRE_ORDER: Record<Edition, Genre[]> = {
  entertainment: ['music', 'japanese-movie', 'foreign-movie', 'japanese-drama', 'foreign-drama', 'anime', 'variety', 'streaming-video', 'books-comics'],
  'culture-lifestyle': ['sns-buzz', 'buzzwords', 'gourmet', 'hobby', 'fashion', 'gadgets', 'games', 'travel', 'economy-money', 'dev-trends'],
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
  'dev-trends': '開発手法・開発サービス',
}

// 継続度ラベルのバッジに表示する日本語ラベル(requirements.md#継続度・注目度の表示-13。
// 訪問者は英語の識別子の意味を知らないため、画面には必ずこのラベルを出す)
export const DURATION_LABELS: Record<DurationLabel, string> = {
  'pre-trend': '流行前',
  emerging: '注目され始め',
  talked: '話題',
  'highly-talked': '非常に話題',
}

// 注目度ラベルのバッジに表示する日本語ラベル(同上)
export const HEAT_LABELS: Record<HeatLabel, string> = {
  high: '注目度 高い',
  normal: '注目度 普通',
  low: '注目度 低い',
}

// トピックに添える継続度・注目度の情報(trend-historyの判定結果を公開時点の値として保存したもの)。
// 画面側で再計算はしない(requirements.md#継続度・注目度の表示の扱い-6)
export type TopicTrend = {
  durationLabel: DurationLabel // どれだけ続いているか([trend-history/requirements.md#継続度ラベル](../trend-history/requirements.md))。「流行前」も掲載されうる
  heatLabel: HeatLabel // 今どれくらい強いか([trend-history/requirements.md#注目度ラベル](../trend-history/requirements.md))
  continuationDays: number // 途切れずに検知され続けている日数([trend-history/design.md](../trend-history/design.md)「途切れずに続いている期間を求める処理」の定義をそのまま持つ。公開時点までの日数ではない)
  continuationStartDate: string // YYYY-MM-DD。途切れずに検知され続けている期間の開始日
  reportCount: number // 通算何回目の報告か。初掲載は1
  originRegion: string | null // 発祥地域。不明はnull(表示しない)
  currentRegions: string[] // 現在の主な流行地域。不明は空配列(表示しない)
}

// 図解(content-generation/requirements.md#図解-7、news-digest/article-detail/design.mdの前提:
// 記事データの形式と同一の形。アプリごとに型定義は独立して持つ)。Mermaid記法の文字列をそのまま保存し、
// レンダリングはクライアント側のMermaidライブラリ(DiagramView)に委ねる(2026-10改定: 画像による
// 図解(AI画像生成→コードでのアイコン図SVG描画)も試みたが、いずれも求める品質を満たせなかった
// ため、画像による図解は行わないことにし、Mermaid図のみを図解として扱う)
export type Diagram = { type: 'mermaid'; code: string }

export type TopicSection = {
  heading: string // 結論文(短い見出し)
  text: string // 本文
  diagram: Diagram | null // 図解(requirements.md#継続度・注目度の表示-20)。不要な観点はnull
}

// 固定3観点。この3キー・この順序で固定(content-generation/requirements.md#要約-3)。
// 各キーの固定ラベル(画面に常時表示する観点名そのもの。requirements.md#継続度・注目度の表示-19)はコード側の定数として持つ
export type TopicSections = {
  fact: TopicSection // 急上昇の事実
  reason: TopicSection // なぜ注目されたか
  caveat: TopicSection // 確からしさ・注意点
}

export const SECTION_LABELS: Record<keyof TopicSections, string> = {
  fact: '急上昇の事実',
  reason: 'なぜ注目されたか',
  caveat: '確からしさ・注意点',
}

type TopicBase = {
  id: string // 記事内で一意。フィードバックの紐付けに使う(例: "topic-1")
  genre: Genre
  heading: string // content-generationが生成する見出し
  sourceTitle: string // 対象作品・話題の原題(content-selectionのCandidate.titleをそのまま引き継ぐ。掲載実績・履歴の突合キーとして使う。表示はしない)
  sourceName: string // 出典の情報源名
  sourceUrl: string // 出典の元URL
  trend?: TopicTrend // 継続度・注目度の情報。この機能より前に公開した記事は持たないため任意(requirements.md#継続度・注目度の表示-18)
}

// この機能(固定3観点・図解)より前に公開した記事が持つ形(単一のbody文字列)。
// 過去記事を書き換えずそのまま表示し続けるため、新形式と並存させる(requirements.md#継続度・注目度の表示-19、ai-dev-digestのLegacyTopicと同じ設計判断)
export type LegacyTopic = TopicBase & {
  body: string // 160〜480字、目安200〜400字
}

// この機能以降に生成する記事が持つ形
export type CurrentTopic = TopicBase & {
  sections: TopicSections
}

export type Topic = LegacyTopic | CurrentTopic

// bodyを持つかどうかで新旧を判定する(ai-dev-digest/lib/types.tsのisLegacyTopicと同じパターン)
export function isLegacyTopic(topic: Topic): topic is LegacyTopic {
  return 'body' in topic
}

export type Article = {
  id: string // ファイル名と一致
  edition: Edition
  date: string // YYYY-MM-DD。発行日
  topics: Topic[] // ジャンルの定義順(GENRE_ORDER)に並ぶ。各ジャンル1件
  // 情報源から話題を1件も取得できなかったジャンル(requirements.md#継続度・注目度の表示-17)。
  // 見出しは出したうえで取得できなかった旨を表示するため、topicsに入らないジャンルをここで持つ。
  // この機能より前に公開した記事は持たないため任意
  unavailableGenres?: Genre[]
}
