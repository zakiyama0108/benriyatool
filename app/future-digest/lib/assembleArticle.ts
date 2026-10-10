import type { Article, Edition, EmptySlot, Genre, Horizon, Prediction } from './types'
import { horizonsForIssue } from './types'
import type { CollectionFailureReason } from './candidateTypes'

// 記事データの組み立て(仕様: weekly-publish/requirements.md#掲載件数の保証-1・2・4、
// weekly-publish/design.md「1回分の記事を生成する処理」手順5)。
// 選定結果(候補なし・収集失敗の枠)と生成結果(予測・生成に失敗した枠)から、
// article-detail/design.mdのArticleスキーマに従う記事データを組み立てる純粋関数。
// ファイル入出力はscripts/future-digest/write-article.ts(Task3)が担う。
//
// 入力はscripts側でJSONファイルから読み込んだ値(型検証されていないunknown由来)のため、
// 分類ラベル(collectionFailureReason)の有無をTSの型だけに頼らずここで実行時に検証する
// (収集失敗の枠に分類ラベルがない・候補なしや生成失敗の枠に分類ラベルがあるものはいずれも不正な入力)

// 収集失敗以外の枠(候補なし・生成失敗)の入力。分類ラベルを持たない
type PlainSlotInput = { genre: Genre; horizon: Horizon; collectionFailureReason?: unknown }
// 収集失敗の枠の入力。分類ラベルを必須で持つ
type CollectionFailedSlotInput = { genre: Genre; horizon: Horizon; collectionFailureReason: unknown }

const COLLECTION_FAILURE_REASONS: CollectionFailureReason[] = ['timeout', 'invalid-format', 'other']

function assertNoCollectionFailureReason(slot: PlainSlotInput, slotKindLabel: string): void {
  if (slot.collectionFailureReason !== undefined) {
    throw new Error(
      `${slotKindLabel}の枠(${slot.genre}--${slot.horizon})に分類ラベル(collectionFailureReason)を指定できません`
    )
  }
}

function assertValidCollectionFailureReason(slot: CollectionFailedSlotInput): CollectionFailureReason {
  if (!COLLECTION_FAILURE_REASONS.includes(slot.collectionFailureReason as CollectionFailureReason)) {
    throw new Error(
      `収集失敗の枠(${slot.genre}--${slot.horizon})に分類ラベル(collectionFailureReason)が必要です: ${String(slot.collectionFailureReason)}`
    )
  }
  return slot.collectionFailureReason as CollectionFailureReason
}

function slotKey(genre: Genre, horizon: Horizon): string {
  return `${genre}--${horizon}`
}

export function assembleArticle(
  date: string,
  edition: Edition,
  issueNumber: number,
  activeGenres: Genre[],
  predictions: Prediction[],
  noCandidateSlots: PlainSlotInput[],
  collectionFailedSlots: CollectionFailedSlotInput[],
  failedSlots: PlainSlotInput[],
): Article {
  const horizons = horizonsForIssue(issueNumber)

  for (const slot of noCandidateSlots) assertNoCollectionFailureReason(slot, '候補なし')
  for (const slot of failedSlots) assertNoCollectionFailureReason(slot, '生成に失敗した')

  const emptySlots: EmptySlot[] = [
    ...noCandidateSlots.map((s) => ({ genre: s.genre, horizon: s.horizon, reason: 'no-candidate' as const })),
    ...collectionFailedSlots.map((s) => ({
      genre: s.genre,
      horizon: s.horizon,
      reason: 'collection-failed' as const,
      collectionFailureReason: assertValidCollectionFailureReason(s),
    })),
    ...failedSlots.map((s) => ({ genre: s.genre, horizon: s.horizon, reason: 'generation-failed' as const })),
  ]

  // 有効な全ジャンル×その回の2時間軸の枠が過不足なく現れることを検証する
  // (weekly-publish/requirements.md#掲載件数の保証-1・2・4。黙って枠が消える・重複する事故を防ぐ)
  const expectedKeys = new Set(activeGenres.flatMap((genre) => horizons.map((horizon) => slotKey(genre, horizon))))
  const actualKeys = [
    ...predictions.map((p) => slotKey(p.genre, p.horizon)),
    ...emptySlots.map((s) => slotKey(s.genre, s.horizon)),
  ]

  if (actualKeys.length !== new Set(actualKeys).size) {
    throw new Error('予測・掲載できなかった枠に同じ枠(ジャンル×時間軸)が重複しています')
  }
  if (actualKeys.length !== expectedKeys.size || actualKeys.some((key) => !expectedKeys.has(key))) {
    throw new Error(
      '予測・掲載できなかった枠(emptySlots)の合計が、有効な全ジャンル×その回の2時間軸の枠と一致しません'
    )
  }

  // 記事IDは<配信日>-<edition>の形式にする(trend-digestと同じ形式。
  // weekly-publish/design.md「決定事項」。1日に2編の記事が存在しうるため日付だけでは一意にならない)
  return { id: `${date}-${edition}`, edition, date, issueNumber, predictions, emptySlots }
}
