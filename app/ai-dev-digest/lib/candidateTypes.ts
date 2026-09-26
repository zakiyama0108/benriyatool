import type { SourceType } from './types'

// 収集した候補・選定結果の型定義(仕様: design.md「データ設計」)。
// selection.tsの入出力はこの型のみで完結する純粋なデータのため、Supabase・ファイル入出力を
// 持たずvitestで完全にテストできる(design.md「関連するファイル(抜粋)」参照)

export type Candidate = {
  sourceId: string // watchlist.jsonのエントリid
  sourceName: string // 発信者名(例: "Anthropic")
  sourceType: SourceType // article-detailのTopic.sourceTypeと同じ種別
  heading: string // 原文タイトル
  url: string // 元URL
  publishedAt: string // ISO 8601形式の公開日時
  // 採用基準の判定に使う数値。qiita/zennはいいね数、individual-youtubeは再生回数。
  // official/individual-blogは常に基準を満たすため判定には使わない(0でよい)
  metricValue: number
  // individual-youtubeのみ: 候補群を除いた直後のyoutubeRecentVideoWindow本の平均再生回数。
  // 直近youtubeCandidateVideoCount本の候補は全て同じこの平均値を採用基準にする(design.md「採用基準を判定する処理」手順2)
  recentAverageViews?: number
}

export type JudgedCandidate = Candidate & {
  meetsCriteria: boolean
  // meetsCriteriaがfalseの場合のみ設定。基準からの乖離内容(例: "いいね数18件(基準30件に11件不足)")
  shortfallReason?: string
}

export type SelectedTopic = JudgedCandidate & {
  // 採用基準未達のまま採用された場合true(content-selection/requirements.md#1日の掲載件数-10)
  belowCriteria: boolean
}

export type SelectionResult =
  | { status: 'ok'; topics: SelectedTopic[] }
  | { status: 'skipped'; reason: string } // 実在する候補が1件もない日(requirements.md#1日の掲載件数-10)
