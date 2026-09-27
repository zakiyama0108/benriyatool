// 情報源ウォッチリスト・採用基準の型定義(仕様: design.md「データ設計(ウォッチリスト・採用基準)」)。
// 実データはcontent/trend-digest/watchlist.json・criteria.jsonに置く(requirements.mdとの二重管理。
// 変更はsource-reviewの月次見直しのみで行う)

import type { Edition, Genre } from './types' // article-detail/design.mdが定義する型を再利用(重複定義しない)
import type { HistoryCriteria } from './historyTypes' // trend-history/design.mdが定義する継続度・注目度の判定に使う値

export type SelectionMethod = 'fixed-list' | 'websearch'

// 固定リストジャンルの情報源が、どの取得・パース処理を使うかを表す
// (初回配信で汎用の正規表現1パターンが実際のサイト構造に対応しきれなかった反省から、
// 構造化データを最優先し、無い場合のみサイトごとの専用パーサーを用意する方針にした。design.md参照)
export type FixedListSourceFormat =
  | 'structured-tsv' // 公式の構造化データ(タブ区切り)をそのまま取得する。例: Netflix公式Top10データ
  | 'structured-rss' // 公式のRSSフィードをそのまま取得する。例: Google公式トレンドRSS
  | 'structured-json-api' // 公式Web APIのJSONレスポンスをそのまま取得する。例: Steam公式Web API
  | 'site-specific-html' // サイトごとに専用のパース関数(`scripts/trend-digest/sourceParsers/<parserId>.ts`)でHTMLから抽出する

// 情報源の地域区分(requirements.md#情報源の地域区分-1)。
// trend-historyの日本での強度・海外での強度の判定に使う
export type SourceRegion = 'japan' | 'overseas'

export type WatchlistEntry = {
  genre: Genre
  edition: Edition
  label: string // 表示・PR本文用の日本語ジャンル名(例: "音楽")
  method: SelectionMethod
  sources: Array<{
    name: string
    url: string
    format?: FixedListSourceFormat // 固定リストジャンルのみ必須
    parserId?: string // format: 'site-specific-html'のみ必須。scripts/trend-digest/sourceParsers/配下のモジュール名
    region: SourceRegion // その情報源が日本の流行と海外の流行のどちらを映すかの区分
  }> // 固定リストジャンルの情報源。WebSearchジャンルは検索の手がかりとして空でもよい
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
  minIndependentSources: number // 「独立した言及が広がっている」と判定する最低独立言及元数(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-2)
}

export type GenreCriteria = FixedListGenreCriteria | WebSearchGenreCriteria

// 1ジャンルあたり・1回あたりの掲載件数の上限は持たない(design.md「データ設計」)。
// 掲載件数は「その編のジャンル数と同じ(各ジャンル1件)」に固定されており(requirements.md#掲載件数-1〜2)、
// 調整できる値ではないため、旧perGenreMax・perEditionMaxは削除した
export type Criteria = {
  newEntryLookbackWeeks: number // 「新規ランクイン」を判定する際、何週間分の過去記事の掲載トピックを参照するか
  genreCriteria: Record<Genre, GenreCriteria>
  history: HistoryCriteria // 継続度ラベル・注目度ラベルの判定に使う値(trend-history/design.md「履歴データの形式」)
}
