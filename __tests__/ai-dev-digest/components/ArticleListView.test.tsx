import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ArticleListView from '../../../app/ai-dev-digest/components/ArticleListView'
import type { Article } from '../../../app/ai-dev-digest/lib/types'

function makeArticle(date: string): Article {
  return {
    date,
    topics: [
      {
        id: 'topic-1',
        heading: '見出し',
        sections: [
          { heading: '見出し1', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
          { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
        ],
        sourceType: 'official',
        sourceName: 'Anthropic',
        sourceUrl: 'https://www.anthropic.com/news/example',
        sourcePublishedAt: '2026-07-31T10:00:00Z',
        belowCriteria: false,
      },
    ],
  }
}

// 仕様: specs/ai-dev-digest/article-list/requirements.md#一覧表示-3
describe('記事一覧の空状態表示 - 記事が1件も存在しない場合はその旨を伝える', () => {
  it('記事が0件のとき、「まだ記事がありません」の案内文が表示されること', () => {
    render(<ArticleListView articles={[]} currentPage={1} totalPages={0} />)
    expect(screen.getByText('まだ記事がありません。しばらくお待ちください。')).toBeTruthy()
  })

  it('記事が1件以上あるとき、案内文は表示されずカード一覧が表示されること', () => {
    render(<ArticleListView articles={[makeArticle('2026-08-01')]} currentPage={1} totalPages={1} />)
    expect(screen.queryByText('まだ記事がありません。しばらくお待ちください。')).toBeNull()
    expect(screen.getByRole('link')).toBeTruthy()
  })
})
