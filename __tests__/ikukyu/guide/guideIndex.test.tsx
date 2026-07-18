import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page, { metadata } from '../../../app/ikukyu/guide/page'
import { GUIDE_ARTICLES } from '../../../app/ikukyu/guide/lib/articleMeta'

// 仕様: specs/ikukyu/guide/requirements.md#記事ページ共通-11、specs/ikukyu/guide/requirements.md#5. UI/UX要件-2
describe('ガイド記事一覧ページ - 3記事へのカードリンクを置き、今後の記事追加の受け皿にする', () => {
  it('3記事すべてへのリンクカードが表示されること', () => {
    render(<Page />)
    for (const article of GUIDE_ARTICLES) {
      const link = screen.getByRole('link', { name: new RegExp(article.title.slice(0, 10)) })
      expect(link.getAttribute('href')).toBe(`/ikukyu/guide/${article.slug}`)
    }
  })

  it('各記事カードに記事ごとのテーマカラー(ミント・スカイ・ピンク)が適用されること', () => {
    const { container } = render(<Page />)
    expect(container.querySelector('.text-teal-600')).toBeTruthy()
    expect(container.querySelector('.text-sky-600')).toBeTruthy()
    expect(container.querySelector('.text-pink-600')).toBeTruthy()
  })

  it('シミュレーターへのCTAが表示され、タイトルタグに「ガイド」が含まれること', () => {
    render(<Page />)
    const ctas = screen.getAllByRole('link', { name: /計算/ }).filter((link) => link.getAttribute('href') === '/ikukyu')
    expect(ctas.length).toBeGreaterThan(0)
    expect(metadata.title as string).toContain('ガイド')
  })
})
