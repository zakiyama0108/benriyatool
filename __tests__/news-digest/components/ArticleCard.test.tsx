import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ArticleCard from '../../../app/news-digest/components/ArticleCard'

// 仕様: specs/news-digest/article-list/requirements.md#一覧表示-2、specs/news-digest/article-list/requirements.md#一覧表示-4、specs/news-digest/article-list/requirements.md#一覧表示-5
describe('記事カード表示 - 記事タイトル・公開日・トピック見出し・導入文・カテゴリ・詳細ページへのリンクを表示する', () => {
  it('記事タイトルと公開日が表示されること', () => {
    render(<ArticleCard date="2026-08-05" topics={[]} totalTopicCount={0} />)
    expect(screen.getByText('2026-08-05')).toBeTruthy()
    expect(screen.getByText(/2026年8月5日週の重要ニュース/)).toBeTruthy()
  })

  it('トピックが3件以下のとき、すべての見出し・導入文・カテゴリバッジが表示され「他N件」は表示されないこと', () => {
    render(
      <ArticleCard
        date="2026-08-05"
        topics={[
          { heading: '見出しA', category: 'general', whatHappenedTeaser: '何が起きたかの導入文A' },
          { heading: '見出しB', category: 'kanagawa', whatHappenedTeaser: '何が起きたかの導入文B' },
        ]}
        totalTopicCount={2}
      />
    )
    expect(screen.getByText('・見出しA')).toBeTruthy()
    expect(screen.getByText('何が起きたかの導入文A')).toBeTruthy()
    expect(screen.getByText('・見出しB')).toBeTruthy()
    expect(screen.getByText('何が起きたかの導入文B')).toBeTruthy()
    expect(screen.getByText('総合')).toBeTruthy()
    expect(screen.getByText('神奈川ローカル')).toBeTruthy()
    expect(screen.queryByText(/他\d+件/)).toBeNull()
  })

  it('トピックの総数がカードに表示された件数より多いとき、「他N件」が表示されること', () => {
    render(
      <ArticleCard
        date="2026-08-05"
        topics={[
          { heading: '見出しA', category: 'general', whatHappenedTeaser: '導入文A' },
          { heading: '見出しB', category: 'general', whatHappenedTeaser: '導入文B' },
          { heading: '見出しC', category: 'general', whatHappenedTeaser: '導入文C' },
        ]}
        totalTopicCount={5}
      />
    )
    expect(screen.getByText('他2件')).toBeTruthy()
  })

  it('詳細ページへのリンクが表示されること', () => {
    render(<ArticleCard date="2026-08-05" topics={[]} totalTopicCount={0} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/news-digest/2026-08-05')
  })
})
