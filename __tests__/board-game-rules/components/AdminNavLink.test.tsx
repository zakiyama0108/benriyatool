import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import AdminNavLink from '../../../app/board-game-rules/components/AdminNavLink'
import { useSession } from '../../../app/board-game-rules/lib/useSession'
import { isAuthorizedAdmin } from '../../../app/lib/adminAuth'

// セッション状態はuseSessionから、運営者判定はisAuthorizedAdminから来るため、
// いずれもモックして「出し分けの条件」だけを検証する
vi.mock('../../../app/board-game-rules/lib/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../../app/lib/adminAuth', () => ({ isAuthorizedAdmin: vi.fn() }))

function makeSession(email: string): Session {
  return { user: { email } } as unknown as Session
}

// 仕様: specs/board-game-rules/admin/requirements.md#ログイン・アクセス制御-18、specs/board-game-rules/admin/design.md#共通ナビに管理画面への導線を表示する処理
describe('共通ナビの管理画面導線(AdminNavLink) - 運営者ログイン中に限り管理画面へのリンクを表示する', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未ログインのとき、権限確認を行わず何も描画しないこと', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })

    const { container } = render(<AdminNavLink />)

    expect(container.firstChild).toBeNull()
    expect(isAuthorizedAdmin).not.toHaveBeenCalled()
  })

  it('ログイン中で運営者本人(isAuthorizedAdminがtrue)のとき、管理画面(/board-game-rules/admin/)へのリンクを表示すること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('admin@example.com'), loading: false })
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)

    render(<AdminNavLink />)

    const link = await screen.findByRole('link', { name: /管理画面/ })
    // next.config.tsのtrailingSlash設定はテスト環境(jsdom)には反映されないため、
    // ここでは末尾スラッシュなしの生のhref値を検証する(実際のビルドでは/board-game-rules/admin/になる)
    expect(link.getAttribute('href')).toBe('/board-game-rules/admin')
  })

  it('ログイン中でも運営者本人でない(isAuthorizedAdminがfalse)場合は何も描画しないこと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('other@example.com'), loading: false })
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(false)

    const { container } = render(<AdminNavLink />)

    await waitFor(() => expect(isAuthorizedAdmin).toHaveBeenCalled())
    expect(container.firstChild).toBeNull()
  })

  it('権限確認(isAuthorizedAdmin)が例外を投げた場合は、フェイルクローズで何も描画しないこと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('admin@example.com'), loading: false })
    vi.mocked(isAuthorizedAdmin).mockRejectedValue(new Error('確認に失敗'))

    const { container } = render(<AdminNavLink />)

    await waitFor(() => expect(isAuthorizedAdmin).toHaveBeenCalled())
    expect(container.firstChild).toBeNull()
  })
})
