import type { Edition, Genre } from './types' // article-detail/design.mdが定義する型を再利用(重複定義しない)
import type { SelectionMethod } from './watchlistTypes'
import type { DurationLabel, HeatLabel } from './historyTypes' // trend-history/design.mdが定義する継続度ラベル・注目度ラベル

// 収集した候補・選定結果の型定義(仕様: design.md「候補の型(前提)」)。
// selection.tsの入出力はこの型のみで完結する純粋なデータのため、Supabase・ファイル入出力を
// 持たずvitestで完全にテストできる(design.md「関連するファイル(抜粋)」参照)

export type Candidate = {
  genre: Genre
  title: string // 対象作品・話題そのものの原題(検索・重複判定の主キーとして扱う)
  sourceName: string
  sourceUrl: string
  method: SelectionMethod
  strength: number // 並べ替えの優先順位付けに使う数値。固定リスト: 100-順位(順位が高い=強い)。WebSearch: 独立情報源の言及数
  rank: number | null // 固定リストジャンルの候補のその回の順位(1が最上位)。WebSearchジャンルの候補はnull。
                      // trend-historyの観測ログと注目度ラベルの判定に渡す(trend-history/requirements.md#注目度ラベル-9)
  originRegion: string | null // 発祥地域。判定できない場合はnull(=不明。trend-history/requirements.md#地域情報-1)
  currentRegions: string[] // 現在の主な流行地域。判定できない場合は空配列(=不明)
  strengthJapan: number | null // 日本の情報源での言及数。判定できない場合はnull
  strengthOverseas: number | null // 海外の情報源での言及数。判定できない場合はnull
  meetsCriteria: boolean // その回にそのジャンルの採用基準を満たしたか。満たさない項目も観測ログへ渡すため、判定結果を項目に添えて持つ(requirements.md#機能要件-4)
  note?: string // 判定根拠のメモ(新規ランクイン/順位変動/独立情報源数など。ログ・PR本文向け)
}

// そのジャンルの掲載枠に選ばれた1件。trend-historyの判定結果が添えられている
export type SelectedTopic = Candidate & {
  durationLabel: DurationLabel
  heatLabel: HeatLabel
  continuationDays: number
  continuationStartDate: string // 途切れずに検知され続けている期間の開始日(trend-history/design.md)
  reportCount: number // 今回掲載した場合に通算何回目の報告になるか(requirements.md#掲載する話題の選び方-7)
  lastPublishedDurationLabel: DurationLabel | null // 直近掲載時の継続度ラベル。未掲載・判定不能はnull。content-generationが続報の本文を書くために使う
  lastPublishedBody: string | null // 直近掲載時の本文。未掲載はnull。content-generationが続報の重複執筆を防ぐ検証に使う
}

export type SelectionResult =
  // 1件以上のジャンルで話題を選べた場合。topicsはedition内ジャンル順に並ぶ
  | {
      status: 'ok'
      edition: Edition
      topics: SelectedTopic[]
      unavailableGenres: Genre[] // 情報源から項目を1件も取得できなかったジャンル(requirements.md#掲載件数-3)
    }
  // 対象editionのすべてのジャンルで項目を1件も取得できなかった場合(requirements.md#掲載件数-3)
  | { status: 'skipped'; edition: Edition; reason: string }
