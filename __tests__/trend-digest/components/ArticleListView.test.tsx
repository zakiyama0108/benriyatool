import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ArticleListView from '../../../app/trend-digest/components/ArticleListView'
import type { Article } from '../../../app/trend-digest/lib/types'

function makeArticle(id: string): Article {
  return {
    id,
    edition: 'entertainment',
    date: '2026-09-15',
    topics: [
      {
        id: 'topic-1',
        genre: 'music',
        heading: '見出し',
        body: 'あ'.repeat(200),
        sourceTitle: '原題',
        sourceName: '出典',
        sourceUrl: 'https://example.com',
      },
    ],
  }
}

// 仕様: specs/trend-digest/article-list/requirements.md#一覧表示-3
describe('記事一覧の空状態表示 - 記事が1件も存在しない場合はその旨を伝える', () => {
  it('記事が0件のとき、「まだ記事がありません」の案内文が表示されること', () => {
    render(<ArticleListView articles={[]} currentPage={1} totalPages={0} />)
    expect(screen.getByText('まだ記事がありません。しばらくお待ちください。')).toBeTruthy()
  })

  it('記事が1件以上あるとき、案内文は表示されずカード一覧が表示されること', () => {
    render(<ArticleListView articles={[makeArticle('2026-09-15-entertainment')]} currentPage={1} totalPages={1} />)
    expect(screen.queryByText('まだ記事がありません。しばらくお待ちください。')).toBeNull()
    expect(screen.getByRole('link')).toBeTruthy()
  })
})
