import { describe, it, expect } from 'vitest'
import { summarizeEmptyGenres } from '../../../app/research-digest/lib/reviewRecords'
import type { Article } from '../../../app/research-digest/lib/types'

// ジャンルごとに候補なし・有効回数を集計するテスト用の記事データを作る。
// 集計に関係するのはジャンルと状態だけのため、他の項目は最小限の固定値にする
function makeArticle(
  date: string,
  genres: Array<{ genre: string; status: 'selected' | 'no-candidate' | 'collection-failed' | 'generation-failed' }>
): Article {
  const findings: Article['findings'] = []
  const emptyGenres: Article['emptyGenres'] = []
  for (const g of genres) {
    if (g.status === 'selected') {
      findings.push({
        id: g.genre,
        genre: g.genre,
        heading: '見出し',
        body: '本文',
        impact: 'medium',
        impactReason: '根拠',
        sourceTitle: '出典',
        sourceName: '掲載誌',
        sourceUrl: 'https://example.com',
        doi: null,
        publishedYear: 2026,
        isPreprint: false,
      })
    } else {
      emptyGenres.push({ genre: g.genre, reason: g.status })
    }
  }
  return { id: date, date, findings, emptyGenres }
}

// 仕様: specs/research-digest/source-review/requirements.md#見直しの実行-1、specs/research-digest/source-review/requirements.md#見直しの実行-5
describe('月次見直しの材料集め - 候補なしが続いているジャンルを集計する', () => {
  it('期間内(from〜to)の記事だけが集計対象になること', () => {
    const articles = [
      makeArticle('2026-08-01', [{ genre: 'medical-health', status: 'no-candidate' }]),
      makeArticle('2026-09-04', [{ genre: 'medical-health', status: 'no-candidate' }]),
      makeArticle('2026-10-01', [{ genre: 'medical-health', status: 'no-candidate' }]),
    ]
    const summary = summarizeEmptyGenres(articles, '2026-09-01', '2026-09-30')
    const genre = summary.find((s) => s.genre === 'medical-health')
    expect(genre?.effectiveCount).toBe(1)
    expect(genre?.noCandidateCount).toBe(1)
  })

  it('ジャンルごとに候補なしの回数と有効回数(収集失敗を除いた回数)が数えられること', () => {
    const articles = [
      makeArticle('2026-09-03', [{ genre: 'medical-health', status: 'no-candidate' }]),
      makeArticle('2026-09-10', [{ genre: 'medical-health', status: 'selected' }]),
    ]
    const summary = summarizeEmptyGenres(articles, '2026-09-01', '2026-09-30')
    const genre = summary.find((s) => s.genre === 'medical-health')
    expect(genre?.effectiveCount).toBe(2)
    expect(genre?.noCandidateCount).toBe(1)
  })

  it('収集に失敗した回は候補なしの回数にも有効回数にも数えないこと', () => {
    const articles = [
      makeArticle('2026-09-03', [{ genre: 'medical-health', status: 'no-candidate' }]),
      makeArticle('2026-09-10', [{ genre: 'medical-health', status: 'collection-failed' }]),
    ]
    const summary = summarizeEmptyGenres(articles, '2026-09-01', '2026-09-30')
    const genre = summary.find((s) => s.genre === 'medical-health')
    expect(genre?.effectiveCount).toBe(1)
    expect(genre?.noCandidateCount).toBe(1)
  })

  it('生成に失敗したジャンルは候補なしの回数とは別に数えられること', () => {
    const articles = [
      makeArticle('2026-09-03', [{ genre: 'medical-health', status: 'no-candidate' }]),
      makeArticle('2026-09-10', [{ genre: 'medical-health', status: 'generation-failed' }]),
    ]
    const summary = summarizeEmptyGenres(articles, '2026-09-01', '2026-09-30')
    const genre = summary.find((s) => s.genre === 'medical-health')
    expect(genre?.noCandidateCount).toBe(1)
    expect(genre?.generationFailedCount).toBe(1)
    expect(genre?.effectiveCount).toBe(1)
  })

  it('有効回数が1回以上あり、そのすべての回で候補なしだったジャンルには「続いている」の印が付くこと', () => {
    const articles = [
      makeArticle('2026-09-03', [{ genre: 'medical-health', status: 'no-candidate' }]),
      makeArticle('2026-09-17', [{ genre: 'medical-health', status: 'no-candidate' }]),
    ]
    const summary = summarizeEmptyGenres(articles, '2026-09-01', '2026-09-30')
    const genre = summary.find((s) => s.genre === 'medical-health')
    expect(genre?.ongoing).toBe(true)
  })

  it('1回でも採用されたジャンルには「続いている」の印が付かないこと', () => {
    const articles = [
      makeArticle('2026-09-03', [{ genre: 'medical-health', status: 'no-candidate' }]),
      makeArticle('2026-09-17', [{ genre: 'medical-health', status: 'selected' }]),
    ]
    const summary = summarizeEmptyGenres(articles, '2026-09-01', '2026-09-30')
    const genre = summary.find((s) => s.genre === 'medical-health')
    expect(genre?.ongoing).toBe(false)
  })

  it('その月のすべての回で収集に失敗した(有効回数0)ジャンルには印が付かないこと', () => {
    const articles = [makeArticle('2026-09-03', [{ genre: 'medical-health', status: 'collection-failed' }])]
    const summary = summarizeEmptyGenres(articles, '2026-09-01', '2026-09-30')
    const genre = summary.find((s) => s.genre === 'medical-health')
    expect(genre?.effectiveCount).toBe(0)
    expect(genre?.ongoing).toBe(false)
  })
})
