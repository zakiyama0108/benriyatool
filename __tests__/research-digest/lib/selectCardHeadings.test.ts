import { describe, it, expect } from 'vitest'
import { selectCardHeadings } from '../../../app/research-digest/lib/selectCardHeadings'
import type { Article, Finding, Impact } from '../../../app/research-digest/lib/types'
import { GENRE_ORDER } from '../../../app/research-digest/lib/types'

// ジャンル順の何番目かでジャンルを指定する(genres.jsonの追記に依存しないため)
function buildFinding(genreIndex: number, impact: Impact, overrides: Partial<Finding> = {}): Finding {
  const genre = GENRE_ORDER[genreIndex]
  return {
    id: genre,
    genre,
    heading: `見出し:${genre}`,
    body: 'x'.repeat(200),
    impact,
    impactReason: '根拠',
    sourceTitle: '論文名',
    sourceName: '掲載誌',
    sourceUrl: 'https://example.com/a',
    doi: null,
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

function buildArticle(findings: Finding[]): Article {
  return { id: '2026-10-05', date: '2026-10-05', findings, emptyGenres: [] }
}

// 仕様: specs/research-digest/article-list/requirements.md#一覧表示-2、specs/research-digest/article-list/requirements.md#一覧表示-3
describe('各回に載せる見出しの選択 - 影響度順(大→中→小)の先頭3件を選び、大が3件未満なら中・小で補う', () => {
  it('「大」が4件以上ある回は、ジャンル順で先頭3件の「大」だけが選ばれること', () => {
    const article = buildArticle([
      buildFinding(3, 'high'),
      buildFinding(1, 'high'),
      buildFinding(0, 'high'),
      buildFinding(2, 'high'),
    ])

    const headings = selectCardHeadings(article)

    expect(headings.map((h) => h.impact)).toEqual(['high', 'high', 'high'])
    expect(headings.map((h) => h.heading)).toEqual([0, 1, 2].map((i) => `見出し:${GENRE_ORDER[i]}`))
  })

  it('「大」が1件なら「大」1件+「中」2件になること', () => {
    const article = buildArticle([
      buildFinding(0, 'low'),
      buildFinding(1, 'medium'),
      buildFinding(2, 'high'),
      buildFinding(3, 'medium'),
    ])

    expect(selectCardHeadings(article).map((h) => h.impact)).toEqual(['high', 'medium', 'medium'])
  })

  it('「大」が0件なら「中」「小」から影響度順に3件になること', () => {
    const article = buildArticle([buildFinding(0, 'low'), buildFinding(1, 'medium'), buildFinding(2, 'medium')])

    expect(selectCardHeadings(article).map((h) => h.impact)).toEqual(['medium', 'medium', 'low'])
  })

  it('研究が2件なら2件だけ返ること', () => {
    const article = buildArticle([buildFinding(0, 'high'), buildFinding(1, 'medium')])
    expect(selectCardHeadings(article)).toHaveLength(2)
  })

  it('採用0件の回(研究が0件)は空配列を返すこと', () => {
    expect(selectCardHeadings(buildArticle([]))).toEqual([])
  })

  it('掲載できなかったジャンルは選ばれないこと', () => {
    const article: Article = {
      ...buildArticle([buildFinding(0, 'high')]),
      emptyGenres: [{ genre: GENRE_ORDER[1], reason: 'no-candidate' }],
    }

    const headings = selectCardHeadings(article)
    expect(headings).toHaveLength(1)
    expect(headings[0].heading).toBe(`見出し:${GENRE_ORDER[0]}`)
  })

  it('各見出しに影響度と査読前かどうかが付くこと', () => {
    const article = buildArticle([buildFinding(0, 'high', { isPreprint: true })])
    expect(selectCardHeadings(article)[0]).toEqual({
      genre: GENRE_ORDER[0],
      heading: `見出し:${GENRE_ORDER[0]}`,
      impact: 'high',
      isPreprint: true,
    })
  })
})
