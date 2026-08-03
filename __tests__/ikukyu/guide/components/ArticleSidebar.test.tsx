import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ArticleSidebar from '../../../../app/ikukyu/guide/components/ArticleSidebar'

// 仕様: specs/ikukyu/guide/requirements.md#5. UI/UX要件-4
describe('PC版サイドバー(ArticleSidebar) - 768px以上で本文右に表示する目次・CTA・関連記事・参考資料', () => {
  it('目次項目を渡した場合、目次の見出しと各リンクが本文中の対応アンカーへのリンクとして表示されること', () => {
    render(
      <ArticleSidebar
        theme="sky"
        ctaLabel="計算する"
        tocItems={[
          { href: '#section-a', label: 'セクションA' },
          { href: '#section-b', label: 'セクションB' },
        ]}
      />,
    )
    expect(screen.getByText('目次')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'セクションA' }).getAttribute('href')).toBe('#section-a')
    expect(screen.getByRole('link', { name: 'セクションB' }).getAttribute('href')).toBe('#section-b')
  })

  it('目次項目を渡さない場合(記事一覧ページ用)、目次の見出しは表示されず「このガイドについて」の説明が表示されること', () => {
    render(
      <ArticleSidebar
        theme="sky"
        ctaLabel="計算する"
        about={{ title: 'このガイドについて', description: '説明文です。' }}
      />,
    )
    expect(screen.queryByText('目次')).toBeNull()
    expect(screen.getByText('このガイドについて')).toBeTruthy()
    expect(screen.getByText('説明文です。')).toBeTruthy()
  })

  it('シミュレーターへのCTAが常に表示されること', () => {
    render(<ArticleSidebar theme="mint" ctaLabel="自分の条件で計算する →" />)
    const cta = screen.getByRole('link', { name: '自分の条件で計算する →' })
    expect(cta.getAttribute('href')).toBe('/ikukyu')
  })

  it('関連記事を渡した場合、記事タイトルが記事ページへのリンクとして表示されること', () => {
    render(
      <ArticleSidebar
        theme="mint"
        ctaLabel="計算する"
        relatedArticles={[{ slug: 'hayamihyo', title: '月給別・育休給付金早見表' }]}
      />,
    )
    const link = screen.getByRole('link', { name: '月給別・育休給付金早見表' })
    expect(link.getAttribute('href')).toBe('/ikukyu/guide/hayamihyo')
  })

  it('参考資料を渡した場合、出典リンクと最終更新日が表示されること', () => {
    render(
      <ArticleSidebar
        theme="pink"
        ctaLabel="計算する"
        sources={[{ label: '厚生労働省「育児休業等給付について」', href: 'https://example.com/mhlw' }]}
        lastUpdated="2026年7月18日"
      />,
    )
    const link = screen.getByRole('link', { name: /厚生労働省/ })
    expect(link.getAttribute('href')).toBe('https://example.com/mhlw')
    expect(screen.getByText(/2026年7月18日/)).toBeTruthy()
  })
})
