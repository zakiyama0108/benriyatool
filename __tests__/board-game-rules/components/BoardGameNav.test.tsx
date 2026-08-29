import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import BoardGameNav from '../../../app/board-game-rules/components/BoardGameNav'
import { useSession } from '../../../app/board-game-rules/lib/useSession'
import { isAuthorizedAdmin } from '../../../app/lib/adminAuth'

// nav末尾の運営者専用導線(AdminNavLink)の出し分け条件自体はAdminNavLink.test.tsxで検証済みのため、
// ここでは常に未ログイン扱いにして本ファイルの検証対象(実装済み画面へのリンク)に影響させない。
// adminAuthはsupabaseClient初期化(環境変数必須)を伴うため、未使用でもモックして読み込みを避ける
vi.mock('../../../app/board-game-rules/lib/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../../app/lib/adminAuth', () => ({ isAuthorizedAdmin: vi.fn() }))
vi.mocked(useSession).mockReturnValue({ session: null, loading: false })

function makeSession(email: string): Session {
  return { user: { email } } as unknown as Session
}

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

// 仕様: specs/board-game-rules/admin/requirements.md#画面レイアウト・回遊導線-13、specs/board-game-rules/admin/design.md#共通ナビに管理画面への導線を表示する処理
describe('共通ナビ(左サイドバー) - active="admin"で管理画面導線を現在地として渡す', () => {
  it('active="admin"かつ運営者本人のとき、管理画面リンクが現在地(aria-current="page")として表示されること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('admin@example.com'), loading: false })
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)

    render(<BoardGameNav active="admin" />)

    const nav = screen.getByRole('navigation', { name: '共通ナビ' })
    const link = await within(nav).findByRole('link', { name: /管理画面/ })
    expect(link.getAttribute('aria-current')).toBe('page')
  })
})
