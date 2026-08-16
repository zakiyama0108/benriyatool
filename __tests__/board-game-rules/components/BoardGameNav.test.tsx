import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BoardGameNav from '../../../app/board-game-rules/components/BoardGameNav'

// 仕様: specs/board-game-rules/game-registration/design.md「ナビゲーション(左サイドバー共通ナビ)」、
//       specs/board-game-rules/favorite/design.md「お気に入り一覧画面」左サイドバー(共通ナビ)、
//       specs/board-game-rules/game-list/design.md「ナビゲーション(左サイドバー共通ナビ)」
// board-game-rulesアプリ全体で共有する左サイドバー。実装済みの遷移先(一覧・登録依頼・お気に入り)を
// この順でリンクとして並べ、activeで渡した画面をハイライト(aria-current="page")する
describe('共通ナビ(左サイドバー) - 実装済み画面へのリンクを並べ、現在地をハイライトする', () => {
  it('一覧・登録依頼・お気に入りへのリンクを、それぞれの画面URLで表示すること', () => {
    render(<BoardGameNav active="register" />)

    const nav = screen.getByRole('navigation', { name: '共通ナビ' })
    const list = within(nav).getByRole('link', { name: /一覧/ })
    const register = within(nav).getByRole('link', { name: /登録依頼/ })
    const favorites = within(nav).getByRole('link', { name: /お気に入り/ })
    expect(list.getAttribute('href')).toBe('/board-game-rules')
    expect(register.getAttribute('href')).toBe('/board-game-rules/register')
    expect(favorites.getAttribute('href')).toBe('/board-game-rules/favorites')
  })

  it('一覧が、登録依頼・お気に入りより先(最上段)に表示されること', () => {
    render(<BoardGameNav active="register" />)

    const nav = screen.getByRole('navigation', { name: '共通ナビ' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent)).toEqual(['一覧', '登録依頼', 'お気に入り'])
  })

  it('active="list"のとき、一覧のみが現在地(aria-current="page")になること', () => {
    render(<BoardGameNav active="list" />)

    const nav = screen.getByRole('navigation', { name: '共通ナビ' })
    expect(within(nav).getByRole('link', { name: /一覧/ }).getAttribute('aria-current')).toBe('page')
    expect(within(nav).getByRole('link', { name: /登録依頼/ }).getAttribute('aria-current')).toBeNull()
    expect(within(nav).getByRole('link', { name: /お気に入り/ }).getAttribute('aria-current')).toBeNull()
  })

  it('active="register"のとき、登録依頼のみが現在地(aria-current="page")になること', () => {
    render(<BoardGameNav active="register" />)

    const nav = screen.getByRole('navigation', { name: '共通ナビ' })
    expect(within(nav).getByRole('link', { name: /登録依頼/ }).getAttribute('aria-current')).toBe('page')
    expect(within(nav).getByRole('link', { name: /お気に入り/ }).getAttribute('aria-current')).toBeNull()
  })

  it('active="favorites"のとき、お気に入りのみが現在地(aria-current="page")になること', () => {
    render(<BoardGameNav active="favorites" />)

    const nav = screen.getByRole('navigation', { name: '共通ナビ' })
    expect(within(nav).getByRole('link', { name: /お気に入り/ }).getAttribute('aria-current')).toBe('page')
    expect(within(nav).getByRole('link', { name: /登録依頼/ }).getAttribute('aria-current')).toBeNull()
  })
})
