// 情報源ウォッチリスト・採用基準の型定義(仕様: design.md「データ設計(ウォッチリスト・採用基準)」)。
// 実データはcontent/trend-digest/watchlist.json・criteria.jsonに置く(requirements.mdとの二重管理。
// 変更はsource-reviewの月次見直しのみで行う)

import type { Edition, Genre } from './types' // article-detail/design.mdが定義する型を再利用(重複定義しない)

export type SelectionMethod = 'fixed-list' | 'websearch'

export type WatchlistEntry = {
  genre: Genre
  edition: Edition
  label: string // 表示・PR本文用の日本語ジャンル名(例: "音楽")
  method: SelectionMethod
  sources: Array<{ name: string; url: string }> // 固定リストジャンルの情報源。WebSearchジャンルは検索の手がかりとして空でもよい
  searchHints?: string[] // WebSearchジャンルのみ。検索クエリの手がかり(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル))
}

// 固定リストジャンルの採用基準(requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル))
export type FixedListGenreCriteria = {
  method: 'fixed-list'
  rankThreshold?: number // 上位何位以内を候補にするか
  newEntryOrRisingRank?: boolean // 新規ランクイン、または順位上昇を候補条件に含めるか
  risingRankMinImprovement?: number // 「大きく上昇」とみなす順位改善幅の最小値(newEntryOrRisingRankがtrueの場合のみ使う)
}

// WebSearchジャンルの採用基準(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル))
export type WebSearchGenreCriteria = {
  method: 'websearch'
  minIndependentSources: number // 「動きがあった」と判定する最低独立情報源数
}

export type GenreCriteria = FixedListGenreCriteria | WebSearchGenreCriteria

export type Criteria = {
  perGenreMax: number // 1ジャンルの最大掲載数(requirements.md#機能要件-4 = 2)
  perEditionMax: number // 1回の最大掲載数(requirements.md#機能要件-5 = 10)
  newEntryLookbackWeeks: number // 「新規ランクイン」を判定する際、何週間分の過去記事の掲載トピックを参照するか
  genreCriteria: Record<Genre, GenreCriteria>
}
