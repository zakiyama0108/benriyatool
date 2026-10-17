import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Breadcrumb from '../../../app/research-digest/components/Breadcrumb'

// 仕様: specs/research-digest/article-list/requirements.md#パンくずナビゲーション-1、specs/research-digest/article-detail/requirements.md#パンくずナビゲーション-1、specs/research-digest/bookmark/requirements.md#パンくずナビゲーション-1
describe('ダイジェスト各ページ共通のパンくず - べんりやつーる・週刊ダイジェスト一覧(/blog)・週刊研究発見の階層を表示する', () => {
  it('記事一覧ページ(currentを渡さない)では、週刊研究発見自体が現在地としてリンクなしで表示されること', () => {
    render(<Breadcrumb />)
    expect(screen.getByRole('link', { name: 'べんりやつーる' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('link', { name: '週刊ダイジェスト一覧' }).getAttribute('href')).toBe('/blog')
    expect(screen.queryByRole('link', { name: '週刊研究発見' })).toBeNull()
    expect(screen.getByText('週刊研究発見')).toBeTruthy()
  })

  it('記事詳細ページ・付箋一覧ページ(currentを渡す)では、週刊研究発見がアプリのトップへのリンクになり、currentが現在地としてリンクなしで表示されること', () => {
    render(<Breadcrumb current="2026年9月7日のからだ・くらし編" />)
    expect(screen.getByRole('link', { name: '週刊研究発見' }).getAttribute('href')).toBe('/research-digest')
    expect(screen.queryByRole('link', { name: '2026年9月7日のからだ・くらし編' })).toBeNull()
    expect(screen.getByText('2026年9月7日のからだ・くらし編')).toBeTruthy()
  })
})
