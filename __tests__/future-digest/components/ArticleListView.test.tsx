import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArticleListView from '../../../app/future-digest/components/ArticleListView'
import type { Article } from '../../../app/future-digest/lib/types'

function buildArticle(id: string, date: string): Article {
  return { id, edition: 'science-tech', date, issueNumber: 1, predictions: [], emptySlots: [] }
}

// 仕様: specs/future-digest/article-list/requirements.md#一覧表示-1、specs/future-digest/article-list/requirements.md#一覧表示-5
describe('記事一覧本体の表示 - 新しい順に並ぶ一覧を表示し、0件時は案内文だけを出す', () => {
  it('渡された記事が新しい順のまま並んで表示されること', () => {
    render(
      <ArticleListView
        articles={[buildArticle('2026-09-24', '2026-09-24'), buildArticle('2026-09-17', '2026-09-17')]}
        currentPage={1}
        totalPages={1}
      />
    )

    const dates = screen.getAllByText(/^2026-09-(24|17)$/).map((el) => el.textContent)
    expect(dates).toEqual(['2026-09-24', '2026-09-17'])
  })

  it('記事が0件のとき、「まだ記事がありません」の案内だけが表示されること', () => {
    render(<ArticleListView articles={[]} currentPage={1} totalPages={0} />)

    expect(screen.getByText(/まだ記事がありません/)).toBeTruthy()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
