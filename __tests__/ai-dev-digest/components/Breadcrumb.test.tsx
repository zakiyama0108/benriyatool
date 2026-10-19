import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Breadcrumb from '../../../app/ai-dev-digest/components/Breadcrumb'

// 仕様: specs/ai-dev-digest/article-list/requirements.md#パンくずナビゲーション-1、specs/ai-dev-digest/article-detail/requirements.md#パンくずナビゲーション-1、specs/ai-dev-digest/bookmark/requirements.md#パンくずナビゲーション-1
describe('ダイジェスト各ページ共通のパンくず - べんりやつーる・週刊ダイジェスト一覧(/blog)・AI駆動開発ダイジェストの階層を表示する', () => {
  it('記事一覧ページ(currentを渡さない)では、AI駆動開発ダイジェスト自体が現在地としてリンクなしで表示されること', () => {
    render(<Breadcrumb />)
    expect(screen.getByRole('link', { name: 'べんりやつーる' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: '週刊ダイジェスト一覧' }).getAttribute('href')).toBe('/blog')
    expect(screen.queryByRole('link', { name: 'AI駆動開発ダイジェスト' })).toBeNull()
    expect(screen.getByText('AI駆動開発ダイジェスト')).toBeTruthy()
  })

  it('記事詳細ページ・付箋一覧ページ(currentを渡す)では、AI駆動開発ダイジェストがアプリのトップへのリンクになり、currentが現在地としてリンクなしで表示されること', () => {
    render(<Breadcrumb current="2026年9月9日のAI駆動開発ニュース" />)
    expect(screen.getByRole('link', { name: 'AI駆動開発ダイジェスト' }).getAttribute('href')).toBe('/ai-dev-digest')
    expect(screen.queryByRole('link', { name: '2026年9月9日のAI駆動開発ニュース' })).toBeNull()
    expect(screen.getByText('2026年9月9日のAI駆動開発ニュース')).toBeTruthy()
  })
})
