import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArticleListView from '../../../app/research-digest/components/ArticleListView'
import type { Article } from '../../../app/research-digest/lib/types'

function buildArticle(date: string): Article {
  return { id: `${date}-body-life`, edition: 'body-life', date, findings: [], emptyGenres: [] }
}

// 仕様: specs/research-digest/article-list/requirements.md#一覧表示-1、specs/research-digest/article-list/requirements.md#一覧表示-4
describe('記事一覧本体の表示 - 新しい順に並ぶ一覧を表示し、0件時は案内文だけを出す', () => {
  it('渡された記事が新しい順のまま並んで表示されること', () => {
    render(
      <ArticleListView articles={[buildArticle('2026-10-12'), buildArticle('2026-10-05')]} currentPage={1} totalPages={1} />
    )

    const dates = screen.getAllByText(/^2026-10-(12|05)$/).map((el) => el.textContent)
    expect(dates).toEqual(['2026-10-12', '2026-10-05'])
  })

  it('記事が0件のとき、「まだ記事がありません」の案内だけが表示されること', () => {
    render(<ArticleListView articles={[]} currentPage={1} totalPages={0} />)

    expect(screen.getByText(/まだ記事がありません/)).toBeTruthy()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
  })
})
