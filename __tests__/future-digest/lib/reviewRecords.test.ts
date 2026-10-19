import { describe, it, expect } from 'vitest'
import { summarizeEmptySlots } from '../../../app/future-digest/lib/reviewRecords'
import type { Article } from '../../../app/future-digest/lib/types'

// 枠(ジャンル×時間軸)ごとに候補なし・有効回数を集計するテスト用の記事データを作る。
// horizonは1回の配信で2区分ずつ扱われる前提(types.ts#horizonsForIssue)だが、
// このテストでは集計対象の枠のみを最小限用意する
function makeArticle(
  date: string,
  slots: Array<{ genre: string; horizon: Article['predictions'][number]['horizon']; status: 'selected' | 'no-candidate' | 'collection-failed' | 'generation-failed' }>
): Article {
  const predictions: Article['predictions'] = []
  const emptySlots: Article['emptySlots'] = []
  for (const slot of slots) {
    if (slot.status === 'selected') {
      predictions.push({
        id: `${slot.genre}--${slot.horizon}`,
        genre: slot.genre,
        horizon: slot.horizon,
        heading: '見出し',
        body: '本文',
        impact: 'medium',
        impactReason: '根拠',
        targetPeriod: '2030年まで',
        sourceTitle: '出典',
        sourceName: '情報源',
        sourceUrl: 'https://example.com',
      })
    } else {
      emptySlots.push({ genre: slot.genre, horizon: slot.horizon, reason: slot.status })
    }
  }
  return { id: date, edition: 'science-tech', date, issueNumber: 1, predictions, emptySlots }
}

// 仕様: specs/future-digest/source-review/requirements.md#見直しの実行-1、specs/future-digest/source-review/requirements.md#見直しの実行-5
describe('月次見直しの材料集め - 候補なしが続いている枠(ジャンル×時間軸)を集計する', () => {
  it('期間内(from〜to)の記事だけが集計対象になること', () => {
    const articles = [
      makeArticle('2026-08-01', [{ genre: 'technology-ai', horizon: 'near', status: 'no-candidate' }]),
      makeArticle('2026-09-04', [{ genre: 'technology-ai', horizon: 'near', status: 'no-candidate' }]),
      makeArticle('2026-10-01', [{ genre: 'technology-ai', horizon: 'near', status: 'no-candidate' }]),
    ]
    const summary = summarizeEmptySlots(articles, '2026-09-01', '2026-09-30')
    const slot = summary.find((s) => s.genre === 'technology-ai' && s.horizon === 'near')
    expect(slot?.effectiveCount).toBe(1)
    expect(slot?.noCandidateCount).toBe(1)
  })

  it('枠ごとに候補なしの回数と有効回数(収集失敗を除いた回数)が数えられること', () => {
    const articles = [
      makeArticle('2026-09-03', [{ genre: 'technology-ai', horizon: 'near', status: 'no-candidate' }]),
      makeArticle('2026-09-10', [{ genre: 'technology-ai', horizon: 'near', status: 'selected' }]),
    ]
    const summary = summarizeEmptySlots(articles, '2026-09-01', '2026-09-30')
    const slot = summary.find((s) => s.genre === 'technology-ai' && s.horizon === 'near')
    expect(slot?.effectiveCount).toBe(2)
    expect(slot?.noCandidateCount).toBe(1)
  })

  it('収集に失敗した回は候補なしの回数にも有効回数にも数えないこと', () => {
    const articles = [
      makeArticle('2026-09-03', [{ genre: 'technology-ai', horizon: 'near', status: 'no-candidate' }]),
      makeArticle('2026-09-10', [{ genre: 'technology-ai', horizon: 'near', status: 'collection-failed' }]),
    ]
    const summary = summarizeEmptySlots(articles, '2026-09-01', '2026-09-30')
    const slot = summary.find((s) => s.genre === 'technology-ai' && s.horizon === 'near')
    expect(slot?.effectiveCount).toBe(1)
    expect(slot?.noCandidateCount).toBe(1)
  })

  it('生成に失敗した枠は候補なしの回数とは別に数えられること', () => {
    const articles = [
      makeArticle('2026-09-03', [{ genre: 'technology-ai', horizon: 'near', status: 'no-candidate' }]),
      makeArticle('2026-09-10', [{ genre: 'technology-ai', horizon: 'near', status: 'generation-failed' }]),
    ]
    const summary = summarizeEmptySlots(articles, '2026-09-01', '2026-09-30')
    const slot = summary.find((s) => s.genre === 'technology-ai' && s.horizon === 'near')
    expect(slot?.noCandidateCount).toBe(1)
    expect(slot?.generationFailedCount).toBe(1)
    expect(slot?.effectiveCount).toBe(1)
  })

  it('有効回数が1回以上あり、そのすべての回で候補なしだった枠には「続いている」の印が付くこと', () => {
    const articles = [
      makeArticle('2026-09-03', [{ genre: 'technology-ai', horizon: 'near', status: 'no-candidate' }]),
      makeArticle('2026-09-17', [{ genre: 'technology-ai', horizon: 'near', status: 'no-candidate' }]),
    ]
    const summary = summarizeEmptySlots(articles, '2026-09-01', '2026-09-30')
    const slot = summary.find((s) => s.genre === 'technology-ai' && s.horizon === 'near')
    expect(slot?.ongoing).toBe(true)
  })

  it('1回でも採用された枠には「続いている」の印が付かないこと', () => {
    const articles = [
      makeArticle('2026-09-03', [{ genre: 'technology-ai', horizon: 'near', status: 'no-candidate' }]),
      makeArticle('2026-09-17', [{ genre: 'technology-ai', horizon: 'near', status: 'selected' }]),
    ]
    const summary = summarizeEmptySlots(articles, '2026-09-01', '2026-09-30')
    const slot = summary.find((s) => s.genre === 'technology-ai' && s.horizon === 'near')
    expect(slot?.ongoing).toBe(false)
  })

  it('その時間軸を扱った回のすべてで収集に失敗した(有効回数0)枠には印が付かないこと', () => {
    const articles = [makeArticle('2026-09-03', [{ genre: 'technology-ai', horizon: 'near', status: 'collection-failed' }])]
    const summary = summarizeEmptySlots(articles, '2026-09-01', '2026-09-30')
    const slot = summary.find((s) => s.genre === 'technology-ai' && s.horizon === 'near')
    expect(slot?.effectiveCount).toBe(0)
    expect(slot?.ongoing).toBe(false)
  })
})
