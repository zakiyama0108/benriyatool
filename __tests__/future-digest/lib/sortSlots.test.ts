import { describe, it, expect } from 'vitest'
import { sortSlots } from '../../../app/future-digest/lib/sortSlots'
import type { Article, Prediction, EmptySlot } from '../../../app/future-digest/lib/types'
import { GENRE_ORDER } from '../../../app/future-digest/lib/types'

function makePrediction(overrides: Partial<Prediction>): Prediction {
  return {
    id: `${overrides.genre}--${overrides.horizon}`,
    genre: GENRE_ORDER[0],
    horizon: 'near',
    heading: '見出し',
    body: 'あ'.repeat(200),
    impact: 'medium',
    impactReason: '根拠',
    targetPeriod: '2030年まで',
    sourceTitle: '元記事',
    sourceName: '情報源',
    sourceUrl: 'https://example.com/a',
    ...overrides,
  }
}

function makeEmptySlot(overrides: Partial<EmptySlot>): EmptySlot {
  return { genre: GENRE_ORDER[0], horizon: 'near', reason: 'no-candidate', ...overrides }
}

function makeArticle(predictions: Prediction[], emptySlots: EmptySlot[] = []): Article {
  return { id: '2026-09-24-science-tech', edition: 'science-tech', date: '2026-09-24', issueNumber: 1, predictions, emptySlots }
}

// 仕様: specs/future-digest/article-detail/requirements.md#並び順の切り替え-8
describe('並び順「影響度」 - 影響度の大きい順に枠を並べる', () => {
  it('影響度が大→中→小の順に並ぶこと', () => {
    const article = makeArticle([
      makePrediction({ genre: GENRE_ORDER[0], horizon: 'near', impact: 'low' }),
      makePrediction({ genre: GENRE_ORDER[1], horizon: 'near', impact: 'high' }),
      makePrediction({ genre: GENRE_ORDER[2], horizon: 'near', impact: 'medium' }),
    ])
    const slots = sortSlots(article, 'impact')
    expect(slots.map((s) => (s.kind === 'prediction' ? s.prediction.impact : null))).toEqual([
      'high',
      'medium',
      'low',
    ])
  })

  // 仕様: specs/future-digest/article-detail/requirements.md#並び順の切り替え-8、specs/future-digest/article-detail/requirements.md#並び順の切り替え-9
  it('同じ影響度の中ではジャンル順→時間軸の近い順に並ぶこと', () => {
    const article = makeArticle([
      makePrediction({ genre: GENRE_ORDER[1], horizon: 'long', impact: 'high' }),
      makePrediction({ genre: GENRE_ORDER[1], horizon: 'near', impact: 'high' }),
      makePrediction({ genre: GENRE_ORDER[0], horizon: 'near', impact: 'high' }),
    ])
    const slots = sortSlots(article, 'impact')
    expect(slots.map((s) => (s.kind === 'prediction' ? `${s.genre}--${s.horizon}` : null))).toEqual([
      `${GENRE_ORDER[0]}--near`,
      `${GENRE_ORDER[1]}--near`,
      `${GENRE_ORDER[1]}--long`,
    ])
  })

  // 仕様: specs/future-digest/article-detail/requirements.md#記事本文の表示-6
  it('候補が見つからなかった枠・収集に失敗した枠・生成に失敗した記事は末尾に、その中はジャンル順に並ぶこと', () => {
    const article = makeArticle(
      [makePrediction({ genre: GENRE_ORDER[0], horizon: 'near', impact: 'low' })],
      [
        makeEmptySlot({ genre: GENRE_ORDER[2], horizon: 'near', reason: 'generation-failed' }),
        makeEmptySlot({ genre: GENRE_ORDER[1], horizon: 'near', reason: 'collection-failed', collectionFailureReason: 'timeout' }),
        makeEmptySlot({ genre: GENRE_ORDER[1], horizon: 'long', reason: 'no-candidate' }),
      ]
    )
    const slots = sortSlots(article, 'impact')
    expect(slots.map((s) => (s.kind === 'prediction' ? 'prediction' : `${s.genre}--${s.horizon}`))).toEqual([
      'prediction',
      `${GENRE_ORDER[1]}--near`,
      `${GENRE_ORDER[1]}--long`,
      `${GENRE_ORDER[2]}--near`,
    ])
  })
})

// 仕様: specs/future-digest/article-detail/requirements.md#並び順の切り替え-9
describe('並び順「ジャンル」 - ジャンルの定義順→時間軸の近い順に枠を並べる', () => {
  it('ジャンルの定義順に並び、同じジャンルの中では時間軸の近い順に並ぶこと(掲載できなかった枠も本来の位置に並ぶ)', () => {
    const article = makeArticle(
      [makePrediction({ genre: GENRE_ORDER[1], horizon: 'long', impact: 'low' })],
      [makeEmptySlot({ genre: GENRE_ORDER[0], horizon: 'long', reason: 'no-candidate' })]
    )
    const slots = sortSlots(article, 'genre')
    expect(slots.map((s) => `${s.genre}--${s.horizon}`)).toEqual([
      `${GENRE_ORDER[0]}--long`,
      `${GENRE_ORDER[1]}--long`,
    ])
  })
})

// 仕様: specs/future-digest/article-detail/requirements.md#記事本文の表示-2、specs/future-digest/article-detail/requirements.md#記事本文の表示-3、specs/future-digest/article-detail/requirements.md#記事本文の表示-4、specs/future-digest/article-detail/requirements.md#記事本文の表示-5
describe('枠の並び替え - 有効なジャンル数×2時間軸の全枠を欠けなく含める', () => {
  it('影響度順・ジャンル順のどちらでも、予測+掲載できなかった枠の合計件数が全枠と一致すること', () => {
    const predictions = GENRE_ORDER.slice(0, 8).map((genre) => makePrediction({ genre, horizon: 'near' }))
    const emptySlots = GENRE_ORDER.slice(8).map((genre) => makeEmptySlot({ genre, horizon: 'near' }))
    const article = makeArticle(predictions, emptySlots)

    expect(sortSlots(article, 'impact')).toHaveLength(predictions.length + emptySlots.length)
    expect(sortSlots(article, 'genre')).toHaveLength(predictions.length + emptySlots.length)
  })
})
