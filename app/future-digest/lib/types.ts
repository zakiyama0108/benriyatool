// 記事データの型定義(仕様: specs/future-digest/article-detail/design.md「前提: 記事データの形式」)。
// architecture.md#実装順により、content-selection・content-generationはこの型に先行して依存していた
// ため、当初は型定義とhorizonsForIssueのみを最小限置いていた。article-detail実装(本ファイル)で
// GENRE_ORDER/GENRE_LABELS/HORIZON_ORDER/HORIZON_LABELS/IMPACT_LABELS/COLLECTION_FAILURE_LABELSを追記する。

import { loadGenres } from './genres'

export type Genre = string // genres.jsonのid(例: "technology-ai")

// ジャンル順の並び替え・LINE配信・一覧の見出し選びで共通に使う表示順(genres.jsonの記載順。
// 廃止したジャンルも過去記事の表示用に含む。design.md「前提: 記事データの形式」)
export const GENRE_ORDER: Genre[] = loadGenres().map((g) => g.id)
export const GENRE_LABELS: Record<Genre, string> = Object.fromEntries(loadGenres().map((g) => [g.id, g.label]))

// 時間軸(content-selection/requirements.md#時間軸)。配列順=「時間軸の近い順」
export type Horizon = 'near' | 'mid' | 'long' | 'ultra-long'
export const HORIZON_ORDER: Horizon[] = ['near', 'mid', 'long', 'ultra-long']
export const HORIZON_LABELS: Record<Horizon, string> = {
  near: '近未来',
  mid: '中期未来',
  long: '長期未来',
  'ultra-long': '超長期未来',
}

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
export const IMPACT_LABELS: Record<Impact, string> = { high: '大', medium: '中', low: '小' }

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

// 収集失敗の分類ラベルの読者向け表示(IMPACT_LABELSと同じ形式)。内部のコード値
// (timeout/invalid-format/other)は変えず、表示文言だけを読者に分かる言葉にする
// (design.md「前提: 記事データの形式」)
export const COLLECTION_FAILURE_LABELS: Record<NonNullable<EmptySlot['collectionFailureReason']>, string> = {
  timeout: '調査が時間内に終わりませんでした',
  'invalid-format': '調査結果を正しく読み取れませんでした',
  other: '調査中にエラーが発生しました',
}

export type Article = {
  id: string // ファイル名と一致(= date)
  date: string // YYYY-MM-DD。発行日
  issueNumber: number // 何回目の配信か(1始まり)
  predictions: Prediction[]
  emptySlots: EmptySlot[]
}
