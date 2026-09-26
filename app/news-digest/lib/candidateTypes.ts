import type { CategoryId } from './watchlistTypes'

// 収集した候補・選定結果の型定義(仕様: design.md「関連するファイル(抜粋)」)。
// selection.tsの入出力はこの型のみで完結する純粋なデータのため、Supabase・ファイル入出力を
// 持たずvitestで完全にテストできる

export type Candidate = {
  sourceId: string // watchlist.jsonのエントリid
  sourceName: string // 発信者名(例: "NHK NEWS WEB")
  category: CategoryId
  heading: string // 原文タイトル
  url: string // 元URL
  publishedAt: string // ISO 8601形式の公開日時
}

export type JudgedCandidate = Candidate & {
  // 総合・経済/ビジネス: 2社以上の裏付けがあるか(requirements.md#採用基準(カテゴリごとの定量判定)-4)。
  // 神奈川ローカル・育児: エージェントが選んだ1件が[4]の基準も満たすか(design.md「候補をグループ化し
  // 採用基準を判定する処理」手順3)
  meetsCriteria: boolean
  // 裏付けた情報源名の配列(自分自身を含む)。design.md「候補をグループ化し採用基準を判定する処理」手順4
  corroboratingSources: string[]
}

export type SelectedTopic = JudgedCandidate & {
  // 専用枠(神奈川ローカル・育児)で基準未達のまま採用された場合true
  // (requirements.md#採用基準(カテゴリごとの定量判定)-5)
  belowCriteria: boolean
  // belowCriteriaがtrueの場合のみ設定。基準からの乖離内容(例: "裏付けメディアが1社(基準2社)")
  belowCriteriaReason?: string
}

export type SelectionResult =
  | { status: 'ok'; topics: SelectedTopic[] }
  | { status: 'skipped'; reason: string } // 全カテゴリで採用候補が0件の週(design.md「エラーハンドリング」)
