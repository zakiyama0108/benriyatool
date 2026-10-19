import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArticleCard from '../../../app/research-digest/components/ArticleCard'
import type { Article, Finding, Impact } from '../../../app/research-digest/lib/types'
import { GENRE_ORDER } from '../../../app/research-digest/lib/types'

function buildFinding(genreIndex: number, impact: Impact, overrides: Partial<Finding> = {}): Finding {
  const genre = GENRE_ORDER[genreIndex]
  return {
    id: genre,
    genre,
    heading: `見出し${genreIndex}`,
    body: 'x'.repeat(200),
    impact,
    impactReason: '根拠',
    sourceTitle: '論文名',
    sourceName: '掲載誌',
    sourceUrl: 'https://example.com/a',
    doi: null,
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

function buildArticle(findings: Finding[] = [], edition: Article['edition'] = 'body-life'): Article {
  return { id: `2026-10-05-${edition}`, edition, date: '2026-10-05', findings, emptyGenres: [] }
}

// 仕様: specs/research-digest/article-list/requirements.md#一覧表示-2、specs/research-digest/article-list/requirements.md#一覧表示-3
describe('記事一覧の1回分のカード表示 - 公開日・タイトル・見出し最大3件・詳細ページへのリンクを表示する', () => {
  it('公開日・記事タイトル・見出しと影響度のバッジ・詳細ページへのリンクが表示されること', () => {
    render(<ArticleCard article={buildArticle([buildFinding(0, 'high'), buildFinding(1, 'medium')])} />)

    expect(screen.getByText('2026-10-05')).toBeTruthy()
    expect(screen.getByText('週刊研究発見 からだ・くらし編 2026年10月5日号')).toBeTruthy()
    expect(screen.getByText('見出し0')).toBeTruthy()
    expect(screen.getByText('見出し1')).toBeTruthy()
    expect(screen.getByText('大')).toBeTruthy()
    expect(screen.getByText('中')).toBeTruthy()
    expect(screen.getByRole('link').getAttribute('href')).toBe('/research-digest/2026-10-05-body-life')
  })

  it('見出しは最大3件までで、影響度の大きい研究が優先されること', () => {
    render(
      <ArticleCard
        article={buildArticle([
          buildFinding(0, 'low'),
          buildFinding(1, 'high'),
          buildFinding(2, 'medium'),
          buildFinding(3, 'high'),
        ])}
      />
    )

    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.queryByText('見出し0')).toBeNull()
  })

  it('査読前の論文の見出しには「査読前」のバッジが表示され、そうでない見出しには表示されないこと', () => {
    render(
      <ArticleCard article={buildArticle([buildFinding(0, 'high', { isPreprint: true }), buildFinding(1, 'high')])} />
    )

    expect(screen.getAllByText('査読前')).toHaveLength(1)
  })

  it('見出しが0件(採用0件の回)のときは見出し欄を表示せず、他の要素だけが表示されること', () => {
    render(<ArticleCard article={buildArticle()} />)

    expect(screen.getByText('2026-10-05')).toBeTruthy()
    expect(screen.getByText('週刊研究発見 からだ・くらし編 2026年10月5日号')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })
})

// 仕様: specs/research-digest/article-list/requirements.md#一覧表示-1、specs/research-digest/article-list/requirements.md#一覧表示-2、specs/research-digest/article-list/design.md「画面設計」
describe('記事一覧の1回分のカード表示 - 編(からだ・くらし編/科学・社会編)のバッジを表示する', () => {
  it('editionがbody-lifeの場合は「からだ・くらし編」のバッジが表示されること', () => {
    render(<ArticleCard article={buildArticle([], 'body-life')} />)
    expect(screen.getByText('からだ・くらし編')).toBeTruthy()
  })

  it('editionがscience-societyの場合は「科学・社会編」のバッジが表示されること', () => {
    render(<ArticleCard article={buildArticle([], 'science-society')} />)
    expect(screen.getByText('科学・社会編')).toBeTruthy()
  })
})
