import type { Article, EmptySlot, Genre, Horizon, Prediction } from './types'
import { GENRE_ORDER, HORIZON_ORDER, IMPACT_ORDER } from './types'

// 掲載した予測と掲載できなかった枠を1つの「枠」として扱うための型
// (design.md「表示する枠の一覧を組み立てる処理」)
export type Slot =
  | { genre: Genre; horizon: Horizon; kind: 'prediction'; prediction: Prediction }
  | { genre: Genre; horizon: Horizon; kind: 'empty'; emptySlot: EmptySlot }

export type SortOrder = 'impact' | 'genre'

function genreIndex(genre: Genre): number {
  const index = GENRE_ORDER.indexOf(genre)
  return index === -1 ? GENRE_ORDER.length : index
}

function horizonIndex(horizon: Horizon): number {
  const index = HORIZON_ORDER.indexOf(horizon)
  return index === -1 ? HORIZON_ORDER.length : index
}

// ジャンルの定義順→時間軸の近い順で比較する(design.md「表示する枠の一覧を組み立てる処理」手順3、
// requirements.md#並び順の切り替え-9)
function compareByGenreOrder(a: Slot, b: Slot): number {
  const genreDiff = genreIndex(a.genre) - genreIndex(b.genre)
  if (genreDiff !== 0) return genreDiff
  return horizonIndex(a.horizon) - horizonIndex(b.horizon)
}

function buildSlots(article: Article): Slot[] {
  const predictionSlots: Slot[] = article.predictions.map((prediction) => ({
    genre: prediction.genre,
    horizon: prediction.horizon,
    kind: 'prediction',
    prediction,
  }))
  const emptySlots: Slot[] = article.emptySlots.map((emptySlot) => ({
    genre: emptySlot.genre,
    horizon: emptySlot.horizon,
    kind: 'empty',
    emptySlot,
  }))
  return [...predictionSlots, ...emptySlots]
}

// 表示する枠の一覧を組み立て、並び順に従って並べ替える(仕様: requirements.md#記事本文の表示-3〜6、
// requirements.md#並び順の切り替え-8〜9、design.md「表示する枠の一覧を組み立てる処理」)
export function sortSlots(article: Article, order: SortOrder): Slot[] {
  const slots = buildSlots(article)

  if (order === 'genre') {
    return [...slots].sort(compareByGenreOrder)
  }

  // 影響度順: 予測がある枠を影響度の大きい順(大→中→小)、同じ影響度の中ではジャンル順に並べる。
  // 掲載できなかった枠は末尾にジャンル順で並べる(requirements.md#記事本文の表示-6、
  // requirements.md#並び順の切り替え-8)
  const predictionSlots = slots.filter((s) => s.kind === 'prediction')
  const emptySlots = slots.filter((s) => s.kind === 'empty')

  predictionSlots.sort((a, b) => {
    const impactDiff = IMPACT_ORDER.indexOf(a.prediction.impact) - IMPACT_ORDER.indexOf(b.prediction.impact)
    if (impactDiff !== 0) return impactDiff
    return compareByGenreOrder(a, b)
  })
  emptySlots.sort(compareByGenreOrder)

  return [...predictionSlots, ...emptySlots]
}
