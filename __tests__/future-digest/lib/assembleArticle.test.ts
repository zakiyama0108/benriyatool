import { describe, it, expect } from 'vitest'
import { assembleArticle } from '../../../app/future-digest/lib/assembleArticle'
import { parseArticle } from '../../../app/future-digest/lib/articleSchema'
import type { Prediction } from '../../../app/future-digest/lib/types'

// テスト用の予測を組み立てる
function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: 'technology-ai--near',
    genre: 'technology-ai',
    horizon: 'near',
    heading: '見出し',
    body: 'あ'.repeat(200),
    impact: 'high',
    impactReason: '多くの人に影響する',
    targetPeriod: '2030年まで',
    sourceTitle: 'サンプル記事',
    sourceName: 'サンプル情報源',
    sourceUrl: 'https://example.com/a',
    ...overrides,
  }
}

const ACTIVE_GENRES = ['technology-ai', 'medical-health']

// issueNumber=1は奇数回のため時間軸は near・long(types.ts horizonsForIssue)

// 仕様: specs/future-digest/weekly-publish/requirements.md#掲載件数の保証-1、specs/future-digest/weekly-publish/requirements.md#掲載件数の保証-2、specs/future-digest/weekly-publish/requirements.md#掲載件数の保証-4
describe('記事データの組み立て - 選定結果・生成結果から記事データ1回分を組み立てる', () => {
  it('id・date・issueNumberが入り、採用した予測がそのまま反映されること', () => {
    const predictions = [
      makePrediction({ id: 'technology-ai--near', genre: 'technology-ai', horizon: 'near' }),
      makePrediction({ id: 'technology-ai--long', genre: 'technology-ai', horizon: 'long' }),
      makePrediction({ id: 'medical-health--near', genre: 'medical-health', horizon: 'near' }),
      makePrediction({ id: 'medical-health--long', genre: 'medical-health', horizon: 'long' }),
    ]

    const article = assembleArticle('2026-10-01', 1, ACTIVE_GENRES, predictions, [], [], [])

    expect(article.id).toBe('2026-10-01')
    expect(article.date).toBe('2026-10-01')
    expect(article.issueNumber).toBe(1)
    expect(article.predictions).toEqual(predictions)
    expect(article.emptySlots).toEqual([])
  })

  it('候補なしの枠がreason: "no-candidate"として掲載できなかった枠に入ること', () => {
    const predictions = [
      makePrediction({ id: 'technology-ai--near', genre: 'technology-ai', horizon: 'near' }),
      makePrediction({ id: 'technology-ai--long', genre: 'technology-ai', horizon: 'long' }),
      makePrediction({ id: 'medical-health--long', genre: 'medical-health', horizon: 'long' }),
    ]
    const noCandidateSlots = [{ genre: 'medical-health', horizon: 'near' as const }]

    const article = assembleArticle('2026-10-01', 1, ACTIVE_GENRES, predictions, noCandidateSlots, [], [])

    expect(article.emptySlots).toEqual([{ genre: 'medical-health', horizon: 'near', reason: 'no-candidate' }])
  })

  it('収集失敗の枠がreason: "collection-failed"と分類ラベル(collectionFailureReason)つきで入ること', () => {
    const predictions = [
      makePrediction({ id: 'technology-ai--near', genre: 'technology-ai', horizon: 'near' }),
      makePrediction({ id: 'technology-ai--long', genre: 'technology-ai', horizon: 'long' }),
      makePrediction({ id: 'medical-health--long', genre: 'medical-health', horizon: 'long' }),
    ]
    const collectionFailedSlots = [{ genre: 'medical-health', horizon: 'near' as const, collectionFailureReason: 'timeout' as const }]

    const article = assembleArticle('2026-10-01', 1, ACTIVE_GENRES, predictions, [], collectionFailedSlots, [])

    expect(article.emptySlots).toEqual([
      { genre: 'medical-health', horizon: 'near', reason: 'collection-failed', collectionFailureReason: 'timeout' },
    ])
  })

  it('生成に失敗した枠がreason: "generation-failed"としてemptySlotsに入ること', () => {
    const predictions = [
      makePrediction({ id: 'technology-ai--near', genre: 'technology-ai', horizon: 'near' }),
      makePrediction({ id: 'technology-ai--long', genre: 'technology-ai', horizon: 'long' }),
      makePrediction({ id: 'medical-health--long', genre: 'medical-health', horizon: 'long' }),
    ]
    const failedSlots = [{ genre: 'medical-health', horizon: 'near' as const }]

    const article = assembleArticle('2026-10-01', 1, ACTIVE_GENRES, predictions, [], [], failedSlots)

    expect(article.emptySlots).toEqual([{ genre: 'medical-health', horizon: 'near', reason: 'generation-failed' }])
  })

  it('収集失敗の枠に分類ラベルがない場合は例外を投げること', () => {
    const predictions = [
      makePrediction({ id: 'technology-ai--near', genre: 'technology-ai', horizon: 'near' }),
      makePrediction({ id: 'technology-ai--long', genre: 'technology-ai', horizon: 'long' }),
      makePrediction({ id: 'medical-health--long', genre: 'medical-health', horizon: 'long' }),
    ]
    // collectionFailureReasonを持たない不正な収集失敗枠
    const collectionFailedSlots = [{ genre: 'medical-health', horizon: 'near' as const, collectionFailureReason: undefined as unknown as 'timeout' }]

    expect(() => assembleArticle('2026-10-01', 1, ACTIVE_GENRES, predictions, [], collectionFailedSlots, [])).toThrow()
  })

  it('候補なしの枠に分類ラベル(collectionFailureReason)がある場合は例外を投げること', () => {
    const predictions = [
      makePrediction({ id: 'technology-ai--near', genre: 'technology-ai', horizon: 'near' }),
      makePrediction({ id: 'technology-ai--long', genre: 'technology-ai', horizon: 'long' }),
      makePrediction({ id: 'medical-health--long', genre: 'medical-health', horizon: 'long' }),
    ]
    const noCandidateSlots = [{ genre: 'medical-health', horizon: 'near' as const, collectionFailureReason: 'timeout' }]

    expect(() => assembleArticle('2026-10-01', 1, ACTIVE_GENRES, predictions, noCandidateSlots, [], [])).toThrow()
  })

  it('生成失敗の枠に分類ラベル(collectionFailureReason)がある場合は例外を投げること', () => {
    const predictions = [
      makePrediction({ id: 'technology-ai--near', genre: 'technology-ai', horizon: 'near' }),
      makePrediction({ id: 'technology-ai--long', genre: 'technology-ai', horizon: 'long' }),
      makePrediction({ id: 'medical-health--long', genre: 'medical-health', horizon: 'long' }),
    ]
    const failedSlots = [{ genre: 'medical-health', horizon: 'near' as const, collectionFailureReason: 'timeout' }]

    expect(() => assembleArticle('2026-10-01', 1, ACTIVE_GENRES, predictions, [], [], failedSlots)).toThrow()
  })

  it('予測とemptySlots(候補なし・収集失敗・生成失敗の3種の合計)を合わせると、有効な全ジャンル×その回の2時間軸の枠と過不足なく一致すること', () => {
    // 枠が1つ足りない(medical-health--nearがどこにも現れない)
    const predictions = [
      makePrediction({ id: 'technology-ai--near', genre: 'technology-ai', horizon: 'near' }),
      makePrediction({ id: 'technology-ai--long', genre: 'technology-ai', horizon: 'long' }),
      makePrediction({ id: 'medical-health--long', genre: 'medical-health', horizon: 'long' }),
    ]

    expect(() => assembleArticle('2026-10-01', 1, ACTIVE_GENRES, predictions, [], [], [])).toThrow()
  })

  it('一致しない入力(枠が重複している)では例外を投げること', () => {
    const predictions = [
      makePrediction({ id: 'technology-ai--near', genre: 'technology-ai', horizon: 'near' }),
      makePrediction({ id: 'technology-ai--long', genre: 'technology-ai', horizon: 'long' }),
      makePrediction({ id: 'medical-health--long', genre: 'medical-health', horizon: 'long' }),
    ]
    // technology-ai--nearが候補なしの枠としても重複して現れる
    const noCandidateSlots = [
      { genre: 'technology-ai', horizon: 'near' as const },
      { genre: 'medical-health', horizon: 'near' as const },
    ]

    expect(() => assembleArticle('2026-10-01', 1, ACTIVE_GENRES, predictions, noCandidateSlots, [], [])).toThrow()
  })

  it('予測が0件(全枠がno-candidate・collection-failed・generation-failedのいずれか)でも組み立てられること', () => {
    const noCandidateSlots = [{ genre: 'technology-ai', horizon: 'near' as const }]
    const collectionFailedSlots = [{ genre: 'technology-ai', horizon: 'long' as const, collectionFailureReason: 'other' as const }]
    const failedSlots = [
      { genre: 'medical-health', horizon: 'near' as const },
      { genre: 'medical-health', horizon: 'long' as const },
    ]

    const article = assembleArticle('2026-10-01', 1, ACTIVE_GENRES, [], noCandidateSlots, collectionFailedSlots, failedSlots)

    expect(article.predictions).toEqual([])
    expect(article.emptySlots).toHaveLength(4)
  })

  it('組み立てた記事がparseArticleの検証を通ること', () => {
    const predictions = [
      makePrediction({ id: 'technology-ai--near', genre: 'technology-ai', horizon: 'near' }),
      makePrediction({ id: 'technology-ai--long', genre: 'technology-ai', horizon: 'long' }),
      makePrediction({ id: 'medical-health--long', genre: 'medical-health', horizon: 'long' }),
    ]
    const noCandidateSlots = [{ genre: 'medical-health', horizon: 'near' as const }]

    const article = assembleArticle('2026-10-01', 1, ACTIVE_GENRES, predictions, noCandidateSlots, [], [])

    expect(() => parseArticle(article, `${article.id}.json`)).not.toThrow()
  })
})
