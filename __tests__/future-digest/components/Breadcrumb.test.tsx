import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Breadcrumb from '../../../app/future-digest/components/Breadcrumb'

// 仕様: specs/future-digest/article-list/requirements.md#パンくずナビゲーション-1、specs/future-digest/article-detail/requirements.md#パンくずナビゲーション-1、specs/future-digest/bookmark/requirements.md#パンくずナビゲーション-1
describe('ダイジェスト各ページ共通のパンくず - べんりやつーる・週刊ダイジェスト一覧(/blog)・週刊未来予測の階層を表示する', () => {
  it('記事一覧ページ(currentを渡さない)では、週刊未来予測自体が現在地としてリンクなしで表示されること', () => {
    render(<Breadcrumb />)
    expect(screen.getByRole('link', { name: 'べんりやつーる' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: '週刊ダイジェスト一覧' }).getAttribute('href')).toBe('/blog')
    expect(screen.queryByRole('link', { name: '週刊未来予測' })).toBeNull()
    expect(screen.getByText('週刊未来予測')).toBeTruthy()
  })

  it('記事詳細ページ・付箋一覧ページ(currentを渡す)では、週刊未来予測がアプリのトップへのリンクになり、currentが現在地としてリンクなしで表示されること', () => {
    render(<Breadcrumb current="2026年9月10日のサイエンス・テクノロジー編" />)
    expect(screen.getByRole('link', { name: '週刊未来予測' }).getAttribute('href')).toBe('/future-digest')
    expect(screen.queryByRole('link', { name: '2026年9月10日のサイエンス・テクノロジー編' })).toBeNull()
    expect(screen.getByText('2026年9月10日のサイエンス・テクノロジー編')).toBeTruthy()
  })
})
