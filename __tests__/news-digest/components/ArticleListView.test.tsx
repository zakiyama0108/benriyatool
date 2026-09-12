import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ArticleListView from '../../../app/news-digest/components/ArticleListView'
import type { Article } from '../../../app/news-digest/lib/types'

function makeArticle(date: string): Article {
  return {
    date,
    topics: [
      {
        id: 'topic-1',
        heading: '見出し',
        category: 'general',
        summary: {
          whatHappened: { heading: 'h', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(300) },
          whyItMatters: { heading: 'h', teaser: 'い'.repeat(60), detail: 'い'.repeat(300) },
          background: { heading: 'h', teaser: 'う'.repeat(60), detail: 'う'.repeat(300) },
          outlook: { heading: 'h', teaser: 'え'.repeat(60), detail: 'え'.repeat(300) },
        },
        importance: 3,
        sourceName: 'NHK NEWS WEB',
        sourceUrl: 'https://www3.nhk.or.jp/news/example.html',
        belowCriteria: false,
      },
    ],
  }
}

// 仕様: specs/news-digest/article-list/requirements.md#一覧表示-3
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

// 仕様: specs/news-digest/article-list/requirements.md#一覧表示-1
describe('記事一覧の組み立て - selectCardTopicsで選んだトピックをArticleCardへ配線し、下部にページネーションを表示する', () => {
  it('記事一覧が新しい順(渡された配列順)にカード表示されること', () => {
    render(
      <ArticleListView
        articles={[makeArticle('2026-08-08'), makeArticle('2026-08-01')]}
        currentPage={1}
        totalPages={1}
      />
    )
    const links = screen.getAllByRole('link')
    expect(links[0].getAttribute('href')).toBe('/news-digest/2026-08-08')
    expect(links[1].getAttribute('href')).toBe('/news-digest/2026-08-01')
  })

  it('総ページ数が2以上のとき、ページネーションが表示されること', () => {
    render(<ArticleListView articles={[makeArticle('2026-08-01')]} currentPage={1} totalPages={2} />)
    expect(screen.getByText('1 / 2')).toBeTruthy()
  })
})
