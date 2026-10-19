import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Breadcrumb from '../../../app/news-digest/components/Breadcrumb'

// 仕様: specs/news-digest/article-list/requirements.md#パンくずナビゲーション-1、specs/news-digest/article-detail/requirements.md#パンくずナビゲーション-1、specs/news-digest/bookmark/requirements.md#パンくずナビゲーション-1
describe('ダイジェスト各ページ共通のパンくず - べんりやつーる・週刊ダイジェスト一覧(/blog)・重要ニュースダイジェストの階層を表示する', () => {
  it('記事一覧ページ(currentを渡さない)では、重要ニュースダイジェスト自体が現在地としてリンクなしで表示されること', () => {
    render(<Breadcrumb />)
    expect(screen.getByRole('link', { name: 'べんりやつーる' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: '週刊ダイジェスト一覧' }).getAttribute('href')).toBe('/blog')
    expect(screen.queryByRole('link', { name: '重要ニュースダイジェスト' })).toBeNull()
    expect(screen.getByText('重要ニュースダイジェスト')).toBeTruthy()
  })

  it('記事詳細ページ・付箋一覧ページ(currentを渡す)では、重要ニュースダイジェストがアプリのトップへのリンクになり、currentが現在地としてリンクなしで表示されること', () => {
    render(<Breadcrumb current="2026年9月9日週の重要ニュース" />)
    expect(screen.getByRole('link', { name: '重要ニュースダイジェスト' }).getAttribute('href')).toBe('/news-digest')
    expect(screen.queryByRole('link', { name: '2026年9月9日週の重要ニュース' })).toBeNull()
    expect(screen.getByText('2026年9月9日週の重要ニュース')).toBeTruthy()
  })
})
