import { describe, it, expect } from 'vitest'
import { buildPredictionIndex } from '../../../app/future-digest/lib/predictionIndex'
import type { Article } from '../../../app/future-digest/lib/types'

// 仕様: specs/future-digest/bookmark/requirements.md#付箋の一覧-10
describe('予測の索引の作成 - 全記事から「記事ID:予測ID」→見出し・ジャンル・時間軸の索引を作る', () => {
  it('予測1件から「記事ID:予測ID」をキーに見出し・ジャンル・時間軸が引けること', () => {
    const articles: Article[] = [
      {
        id: '2026-09-17',
        date: '2026-09-17',
        issueNumber: 1,
        predictions: [
          {
            id: 'technology-ai--near',
            genre: 'technology-ai',
            horizon: 'near',
            heading: '見出しA',
            body: 'x'.repeat(200),
            impact: 'high',
            impactReason: '根拠',
            targetPeriod: '2030年まで',
            sourceTitle: '元記事',
            sourceName: '情報源',
            sourceUrl: 'https://example.com/a',
          },
        ],
        emptySlots: [{ genre: 'medical-health', horizon: 'near', reason: 'no-candidate' }],
      },
    ]

    const index = buildPredictionIndex(articles)

    expect(index['2026-09-17:technology-ai--near']).toEqual({
      heading: '見出しA',
      genre: 'technology-ai',
      horizon: 'near',
    })
  })

  it('掲載できなかった枠(emptySlots)は索引に含まれないこと', () => {
    const articles: Article[] = [
      {
        id: '2026-09-17',
        date: '2026-09-17',
        issueNumber: 1,
        predictions: [],
        emptySlots: [{ genre: 'medical-health', horizon: 'near', reason: 'no-candidate' }],
      },
    ]

    const index = buildPredictionIndex(articles)
    expect(Object.keys(index)).toHaveLength(0)
  })
})
