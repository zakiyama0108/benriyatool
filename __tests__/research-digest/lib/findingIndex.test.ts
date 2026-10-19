import { describe, it, expect } from 'vitest'
import { buildFindingIndex } from '../../../app/research-digest/lib/findingIndex'
import type { Article } from '../../../app/research-digest/lib/types'

// 仕様: specs/research-digest/bookmark/requirements.md#付箋の一覧-10
describe('研究の索引の作成 - 全記事から「記事ID:研究ID」→見出し・ジャンルの索引を作る', () => {
  it('研究1件から「記事ID:研究ID」をキーに見出し・ジャンルが引けること', () => {
    const articles: Article[] = [
      {
        id: '2026-10-05-science-society',
        edition: 'science-society',
        date: '2026-10-05',
        findings: [
          {
            id: 'ai-it',
            genre: 'ai-it',
            heading: '見出しA',
            body: 'x'.repeat(200),
            impact: 'high',
            impactReason: '根拠',
            sourceTitle: '論文名',
            sourceName: '掲載誌',
            sourceUrl: 'https://example.com/a',
            doi: null,
            publishedYear: 2025,
            isPreprint: false,
          },
        ],
        emptyGenres: [{ genre: 'medical-health', reason: 'no-candidate' }],
      },
    ]

    const index = buildFindingIndex(articles)

    expect(index['2026-10-05-science-society:ai-it']).toEqual({ heading: '見出しA', genre: 'ai-it' })
  })

  it('掲載できなかったジャンルは索引に含まれないこと', () => {
    const articles: Article[] = [
      {
        id: '2026-10-05-body-life',
        edition: 'body-life',
        date: '2026-10-05',
        findings: [],
        emptyGenres: [{ genre: 'medical-health', reason: 'no-candidate' }],
      },
    ]

    expect(Object.keys(buildFindingIndex(articles))).toHaveLength(0)
  })
})
