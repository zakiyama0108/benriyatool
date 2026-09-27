// 記事データの型定義(最小限)。
//
// 本来のオーナーは[article-detail](../../../specs/future-digest/article-detail/design.md)
// 「前提: 記事データの形式」で、GENRE_ORDER/GENRE_LABELS/HORIZON_ORDER/HORIZON_LABELS/
// COLLECTION_FAILURE_LABELSなどの表示用定数・parseArticle・articles.tsもそこで定義される。
// architecture.md#実装順により、content-selection・content-generationがこの型に依存するため、
// article-detail本体の実装(表示用定数・スキーマ検証・テスト)に先立ち、article-detail/design.mdの
// 定義どおりに必要最小限(型定義とhorizonsForIssue)だけをここに置く。article-detail実装時に
// このファイルへ表示用定数を追記し、対応するテスト(tasks.md Task2)を書く。

export type Genre = string // genres.jsonのid(例: "technology-ai")

// 時間軸(content-selection/requirements.md#時間軸)。配列順=「時間軸の近い順」
export type Horizon = 'near' | 'mid' | 'long' | 'ultra-long'

// 回数から扱う時間軸2区分を決める(content-selection/requirements.md#時間軸の切り替え-1。
// 奇数回=近未来+長期未来、偶数回=中期未来+超長期未来。article-detail/design.md「前提: 記事データの形式」)
export function horizonsForIssue(issueNumber: number): [Horizon, Horizon] {
  if (!Number.isInteger(issueNumber) || issueNumber < 1) {
    throw new Error(`issueNumberは1以上の整数である必要があります: ${issueNumber}`)
  }
  return issueNumber % 2 === 1 ? ['near', 'long'] : ['mid', 'ultra-long']
}

// 影響度(content-selection/requirements.md#影響度-1)。配列順=影響度の大きい順
export type Impact = 'high' | 'medium' | 'low'
export const IMPACT_ORDER: Impact[] = ['high', 'medium', 'low']

export type Prediction = {
  id: string // 記事内で一意。`<genre>--<horizon>`(例: "technology-ai--near")。フィードバック・付箋の紐付けに使う
  genre: Genre
  horizon: Horizon
  heading: string // content-generationが生成する見出し
  body: string // content-generationが生成する本文(160〜480字、目安200〜400字)
  impact: Impact
  impactReason: string // 影響度の根拠(1文)
  targetPeriod: string // 予測が対象とする時期(例: "2030年まで")
  sourceTitle: string // 元記事のタイトル(配信済み判定の突合に使う)
  sourceName: string // 情報源名
  sourceUrl: string // 元記事のURL
}

// 掲載できなかった枠。reasonで表示文言を出し分ける
export type EmptySlot = {
  genre: Genre
  horizon: Horizon
  reason: 'no-candidate' | 'collection-failed' | 'generation-failed'
  collectionFailureReason?: 'timeout' | 'invalid-format' | 'other' // reasonが'collection-failed'の場合のみ
}

export type Article = {
  id: string // ファイル名と一致(= date)
  date: string // YYYY-MM-DD。発行日
  issueNumber: number // 何回目の配信か(1始まり)
  predictions: Prediction[]
  emptySlots: EmptySlot[]
}
