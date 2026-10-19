import { describe, it, expect } from 'vitest'
import { selectCardHeadings } from '../../../app/future-digest/lib/selectCardHeadings'
import type { Article, Prediction } from '../../../app/future-digest/lib/types'

function buildPrediction(overrides: Partial<Prediction> & Pick<Prediction, 'genre' | 'horizon' | 'impact'>): Prediction {
  const id = `${overrides.genre}--${overrides.horizon}`
  return {
    id,
    heading: `見出し:${id}`,
    body: 'x'.repeat(200),
    impactReason: '根拠',
    targetPeriod: '2030年まで',
    sourceTitle: '元記事',
    sourceName: '情報源',
    sourceUrl: 'https://example.com/a',
    ...overrides,
  }
}

function buildArticle(predictions: Prediction[]): Article {
  return { id: '2026-09-17-science-tech', edition: 'science-tech', date: '2026-09-17', issueNumber: 1, predictions, emptySlots: [] }
}

// 仕様: specs/future-digest/article-list/requirements.md#一覧表示-2、specs/future-digest/article-list/requirements.md#一覧表示-3、specs/future-digest/article-list/requirements.md#一覧表示-4
describe('各回に載せる見出しの選択 - 影響度順(大→中→小)の先頭3件を選び、大が3件未満なら中・小で補う', () => {
  it('「大」が4件以上ある回は、ジャンル順→時間軸の近い順で先頭3件の「大」だけが選ばれること', () => {
    const article = buildArticle([
      buildPrediction({ genre: 'geopolitics', horizon: 'near', impact: 'high' }),
      buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'high' }),
      buildPrediction({ genre: 'medical-health', horizon: 'near', impact: 'high' }),
      buildPrediction({ genre: 'economy-work', horizon: 'near', impact: 'high' }),
    ])

    const headings = selectCardHeadings(article)

    expect(headings).toHaveLength(3)
    expect(headings.map((h) => h.impact)).toEqual(['high', 'high', 'high'])
    // genres.jsonの記載順(GENRE_ORDER)はサイエンス・テクノロジー編5ジャンル→くらし・社会編5ジャンルの
    // 順になるため、geopolitics(サイエンス・テクノロジー編)はeconomy-work(くらし・社会編)より先に並ぶ
    expect(headings.map((h) => h.heading)).toEqual([
      '見出し:technology-ai--near',
      '見出し:medical-health--near',
      '見出し:geopolitics--near',
    ])
  })

  it('「大」が1件なら「大」1件+影響度順で「中」2件になること', () => {
    const article = buildArticle([
      buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'high' }),
      buildPrediction({ genre: 'medical-health', horizon: 'near', impact: 'medium' }),
      buildPrediction({ genre: 'economy-work', horizon: 'near', impact: 'medium' }),
      buildPrediction({ genre: 'geopolitics', horizon: 'near', impact: 'low' }),
    ])

    const headings = selectCardHeadings(article)

    expect(headings.map((h) => h.impact)).toEqual(['high', 'medium', 'medium'])
  })

  it('「大」が0件なら「中」「小」から影響度順で3件になること', () => {
    const article = buildArticle([
      buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'low' }),
      buildPrediction({ genre: 'medical-health', horizon: 'near', impact: 'medium' }),
      buildPrediction({ genre: 'economy-work', horizon: 'near', impact: 'medium' }),
    ])

    const headings = selectCardHeadings(article)

    expect(headings.map((h) => h.impact)).toEqual(['medium', 'medium', 'low'])
  })

  it('予測が2件なら2件だけ返ること', () => {
    const article = buildArticle([
      buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'high' }),
      buildPrediction({ genre: 'medical-health', horizon: 'near', impact: 'medium' }),
    ])

    expect(selectCardHeadings(article)).toHaveLength(2)
  })

  it('採用0件の回(予測が0件)は空配列を返すこと', () => {
    const article = buildArticle([])
    expect(selectCardHeadings(article)).toEqual([])
  })

  it('掲載できなかった枠(emptySlots)は選ばれないこと', () => {
    const article: Article = {
      id: '2026-09-17-science-tech',
      edition: 'science-tech',
      date: '2026-09-17',
      issueNumber: 1,
      predictions: [buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'high' })],
      emptySlots: [{ genre: 'medical-health', horizon: 'near', reason: 'no-candidate' }],
    }

    const headings = selectCardHeadings(article)
    expect(headings).toHaveLength(1)
    expect(headings[0].heading).toBe('見出し:technology-ai--near')
  })

  it('性・恋愛ジャンル(sexuality-romance)の予測も他のジャンルと同じ扱いで選ばれること', () => {
    const article = buildArticle([buildPrediction({ genre: 'sexuality-romance', horizon: 'near', impact: 'high' })])

    const headings = selectCardHeadings(article)
    expect(headings).toHaveLength(1)
    expect(headings[0].heading).toBe('見出し:sexuality-romance--near')
  })

  it('各見出しに影響度(impact)が付くこと', () => {
    const article = buildArticle([buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'high' })])
    expect(selectCardHeadings(article)[0]).toEqual({ heading: '見出し:technology-ai--near', impact: 'high' })
  })
})
