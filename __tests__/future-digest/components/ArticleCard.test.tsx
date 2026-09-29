import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArticleCard from '../../../app/future-digest/components/ArticleCard'
import type { Article } from '../../../app/future-digest/lib/types'

function buildArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: '2026-09-17',
    date: '2026-09-17',
    issueNumber: 1,
    predictions: [],
    emptySlots: [],
    ...overrides,
  }
}

// 仕様: specs/future-digest/article-list/requirements.md#一覧表示-2、specs/future-digest/article-list/requirements.md#一覧表示-3
describe('記事一覧の1回分のカード表示 - 公開日・タイトル・時間軸・見出し最大3件・詳細ページへのリンクを表示する', () => {
  it('公開日・記事タイトル・時間軸2区分・見出しと影響度のバッジ・詳細ページへのリンクが表示されること', () => {
    render(
      <ArticleCard
        article={buildArticle()}
        headings={[
          { heading: '見出しA', impact: 'high' },
          { heading: '見出しB', impact: 'medium' },
        ]}
      />
    )

    expect(screen.getByText('2026-09-17')).toBeTruthy()
    expect(screen.getByText('週刊未来予測 2026年9月17日号')).toBeTruthy()
    expect(screen.getByText('近未来')).toBeTruthy()
    expect(screen.getByText('長期未来')).toBeTruthy()
    expect(screen.getByText('見出しA')).toBeTruthy()
    expect(screen.getByText('見出しB')).toBeTruthy()
    expect(screen.getByText('大')).toBeTruthy()
    expect(screen.getByText('中')).toBeTruthy()

    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/future-digest/2026-09-17')
  })

  it('見出しが0件(採用0件の回)のときは見出し欄を表示せず、他の要素だけが表示されること', () => {
    render(<ArticleCard article={buildArticle()} headings={[]} />)

    expect(screen.getByText('2026-09-17')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })
})
