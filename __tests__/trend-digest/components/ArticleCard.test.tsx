import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ArticleCard from '../../../app/trend-digest/components/ArticleCard'

// 仕様: specs/trend-digest/article-list/requirements.md#一覧表示-2、specs/trend-digest/article-list/requirements.md#ビジネスルール・制約-1
describe('カードに表示するトピック見出しの選択 - 詳細ページと同じ見出しを最大3件まで表示し、超過分は件数のみ示す', () => {
  it('トピックが3件以下のとき、すべての見出しが表示され「他N件」は表示されないこと', () => {
    render(
      <ArticleCard
        id="2026-09-15-entertainment"
        edition="entertainment"
        date="2026-09-15"
        topicHeadings={['見出しA', '見出しB']}
        totalTopicCount={2}
      />
    )
    expect(screen.getByText('・見出しA')).toBeTruthy()
    expect(screen.getByText('・見出しB')).toBeTruthy()
    expect(screen.queryByText(/他\d+件/)).toBeNull()
  })

  it('トピックが4件以上のとき、先頭3件の見出しに加えて「他N件」が表示されること', () => {
    render(
      <ArticleCard
        id="2026-09-15-entertainment"
        edition="entertainment"
        date="2026-09-15"
        topicHeadings={['見出しA', '見出しB', '見出しC']}
        totalTopicCount={5}
      />
    )
    expect(screen.getByText('・見出しA')).toBeTruthy()
    expect(screen.getByText('・見出しB')).toBeTruthy()
    expect(screen.getByText('・見出しC')).toBeTruthy()
    expect(screen.getByText('他2件')).toBeTruthy()
  })
})

// 仕様: specs/trend-digest/article-list/requirements.md#一覧表示-2
describe('カード表示 - グループバッジ・記事タイトル・公開日・詳細ページへのリンクを表示する', () => {
  it('edition・dateから導出したタイトルが表示されること', () => {
    render(
      <ArticleCard
        id="2026-09-15-entertainment"
        edition="entertainment"
        date="2026-09-15"
        topicHeadings={['見出しA']}
        totalTopicCount={1}
      />
    )
    expect(screen.getByText('週刊トレンド エンタメ編 2026年9月15日号')).toBeTruthy()
  })

  it('公開日が表示されること', () => {
    render(
      <ArticleCard
        id="2026-09-15-entertainment"
        edition="entertainment"
        date="2026-09-15"
        topicHeadings={['見出しA']}
        totalTopicCount={1}
      />
    )
    expect(screen.getByText('2026-09-15')).toBeTruthy()
  })

  it('グループバッジ(エンタメ)が表示されること', () => {
    render(
      <ArticleCard
        id="2026-09-15-entertainment"
        edition="entertainment"
        date="2026-09-15"
        topicHeadings={['見出しA']}
        totalTopicCount={1}
      />
    )
    expect(screen.getByText('エンタメ')).toBeTruthy()
  })

  it('記事詳細ページへのリンクが記事idを指すこと', () => {
    render(
      <ArticleCard
        id="2026-09-15-entertainment"
        edition="entertainment"
        date="2026-09-15"
        topicHeadings={['見出しA']}
        totalTopicCount={1}
      />
    )
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/trend-digest/2026-09-15-entertainment')
  })
})
