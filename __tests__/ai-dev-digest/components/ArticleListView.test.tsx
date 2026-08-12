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

// 仕様: specs/ai-dev-digest/article-list/requirements.md#一覧表示-4、specs/ai-dev-digest/article-list/design.md#カードに表示するトピック見出し・メリット導入文を選ぶ処理
describe('カードへのメリット観点導入文の配線(2026-08) - isLegacyTopicでbenefitTeaserの有無を組み立ててArticleCardへ渡す', () => {
  it('CurrentTopic(summaryあり)の記事は、カードに🚀メリット観点の導入文(benefit.teaser)が表示されること', () => {
    const article = {
      date: '2026-08-01',
      topics: [
        {
          id: 'topic-1',
          heading: '見出し',
          summary: {
            benefit: { heading: 'b', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(250) },
            whatsNew: { heading: 'w', teaser: 'い'.repeat(60), detail: 'い'.repeat(250) },
            how: { heading: 'h', teaser: 'う'.repeat(60), detail: 'う'.repeat(250) },
            howToUse: { heading: 'u', teaser: 'え'.repeat(60), detail: 'え'.repeat(250) },
          },
          importance: 4 as const,
          sourceType: 'official' as const,
          sourceName: 'Anthropic',
          sourceUrl: 'https://www.anthropic.com/news/example',
          belowCriteria: false,
        },
      ],
    }
    render(<ArticleListView articles={[article]} currentPage={1} totalPages={1} />)
    expect(screen.getByText('あ'.repeat(60))).toBeTruthy()
  })

  it('LegacyTopic(sectionsあり)の記事は、benefitTeaserが表示されず描画が壊れないこと', () => {
    render(<ArticleListView articles={[makeArticle('2026-08-01')]} currentPage={1} totalPages={1} />)
    expect(screen.getByText('・見出し')).toBeTruthy()
  })
})
