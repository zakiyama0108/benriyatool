import type { Genre, Horizon, Impact } from './types'

// 収集した候補・選定結果の型定義(仕様: content-selection/design.md「データ設計」)。
// selectSlots.ts・shouldAlertOperator.tsの入出力はこの型のみで完結する純粋なデータのため、
// vitestで完全にテストできる(trend-digestのcandidateTypes.tsと同じ考え方)

export type Candidate = {
  genre: Genre
  horizon: Horizon
  impact: Impact
  impactRank: number // 同じ枠・同じ影響度の中での順位(1が最も影響が大きい)。Claudeが3つの観点で判断した結果
  impactReason: string // 影響度の根拠(1文)
  targetPeriod: string // 予測が対象とする時期(例: "2030年まで")
  sourceTitle: string
  sourceName: string
  sourceUrl: string
  publishedAt: string | null // 元記事の公開日(分かる場合のみ)
}

// 収集失敗の分類ラベル(content-selection/requirements.md#収集失敗-2)。利用上限への到達は
// 実行全体を打ち切るため候補に含まない(content-selection/requirements.md#収集失敗-3)
export type CollectionFailureReason = 'timeout' | 'invalid-format' | 'other'

export type SlotResult =
  | { genre: Genre; horizon: Horizon; status: 'selected'; candidate: Candidate; candidateCount: number }
  | { genre: Genre; horizon: Horizon; status: 'no-candidate'; candidateCount: number }
  | { genre: Genre; horizon: Horizon; status: 'collection-failed'; reason: CollectionFailureReason }
