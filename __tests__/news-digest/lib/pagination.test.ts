import { describe, it, expect } from 'vitest'
import { paginate } from '../../../app/news-digest/lib/pagination'

function makeArticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({ date: `2026-08-${String(i + 1).padStart(2, '0')}`, topics: [] }))
}

// 仕様: specs/news-digest/article-list/requirements.md#ビジネスルール・制約-2
describe('記事一覧のページ分割 - 新しい順に20件ずつページ分割する', () => {
  it('21件の記事に対し、1ページ目は新しい順の先頭20件になること', () => {
    const articles = makeArticles(21)
    const result = paginate(articles, 1)
    expect(result.items).toHaveLength(20)
    expect(result.items[0].date).toBe(articles[0].date)
  })

  it('21件の記事に対し、2ページ目は残り1件になること', () => {
    const articles = makeArticles(21)
    const result = paginate(articles, 2)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].date).toBe(articles[20].date)
  })

  it('21件の記事に対し、総ページ数が2になること', () => {
    const result = paginate(makeArticles(21), 1)
    expect(result.totalPages).toBe(2)
  })

  it('pageSizeを指定した場合、その件数で区切られること', () => {
    const result = paginate(makeArticles(5), 1, 2)
    expect(result.items).toHaveLength(2)
    expect(result.totalPages).toBe(3)
  })
})

// 仕様: specs/news-digest/article-list/requirements.md#一覧表示-3
describe('記事が1件も存在しない場合のページ分割結果 - 空の一覧と総ページ数0を返す', () => {
  it('記事が0件のとき、空配列が返り総ページ数が0になること', () => {
    const result = paginate([], 1)
    expect(result.items).toEqual([])
    expect(result.totalPages).toBe(0)
  })
})
