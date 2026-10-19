import type { Genre, Impact } from './types'

// 収集した候補・選定結果の型定義(仕様: content-selection/design.md「データ設計」)。
// selectGenres.ts・shouldAlertOperator.tsの入出力はこの型のみで完結する純粋なデータのため、
// vitestで完全にテストできる

export type Candidate = {
  genre: Genre
  impact: Impact
  impactRank: number // 同じジャンル・同じ影響度の中での順位(1が最も影響が大きい)
  impactReason: string // 影響度の根拠(1文)
  sourceTitle: string // 論文名(公式発表の場合は発表のタイトル)
  sourceName: string // 掲載誌名または発表元
  sourceUrl: string // 論文・公式発表のURL(報道記事のURLではない)
  doi: string | null
  publishedYear: number | null
  isPreprint: boolean
}

// 収集失敗の分類ラベル(content-selection/requirements.md#収集失敗-2)。利用上限への到達は
// 実行全体を打ち切るため候補に含まない(content-selection/requirements.md#収集失敗-3)
export type CollectionFailureReason = 'timeout' | 'invalid-format' | 'other'

export type GenreResult =
  | { genre: Genre; status: 'selected'; candidate: Candidate; candidateCount: number }
  | { genre: Genre; status: 'no-candidate'; candidateCount: number }
  | { genre: Genre; status: 'collection-failed'; reason: CollectionFailureReason }
