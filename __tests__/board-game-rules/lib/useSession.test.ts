import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { useSession } from '../../../app/board-game-rules/lib/useSession'
import * as adminAuth from '../../../app/lib/adminAuth'

// 認証ロジックは既存の共通ライブラリ(adminAuth)を利用するため、ここではモックして
// 「セッションの取得・変化購読・購読解除」というフックの配線だけを検証する
vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(),
}))

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

// 仕様: specs/board-game-rules/user-auth/requirements.md#ログイン・ログアウト-1、specs/board-game-rules/user-auth/requirements.md#ログイン・ログアウト-3
describe('【共通】各画面がログイン状態を参照するためのセッション取得フック - 未ログイン/ログイン中を判定できる', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未ログイン(セッションなし)のとき、初期取得の完了後にsessionがnullで確定すること', async () => {
    vi.mocked(adminAuth.getSession).mockResolvedValue(null)
    vi.mocked(adminAuth.onAuthChange).mockReturnValue(() => {})

    const { result } = renderHook(() => useSession())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.session).toBeNull()
  })

  it('ログイン中のとき、初期取得したセッションがsessionに入ること', async () => {
    vi.mocked(adminAuth.getSession).mockResolvedValue(makeSession('taro@example.com'))
    vi.mocked(adminAuth.onAuthChange).mockReturnValue(() => {})

    const { result } = renderHook(() => useSession())

    await waitFor(() => expect(result.current.session).not.toBeNull())
    expect(result.current.session?.user.email).toBe('taro@example.com')
  })

  it('アンマウント時に、onAuthChangeの購読解除が呼ばれること(購読の後始末)', async () => {
    const unsubscribe = vi.fn()
    vi.mocked(adminAuth.getSession).mockResolvedValue(null)
    vi.mocked(adminAuth.onAuthChange).mockReturnValue(unsubscribe)

    const { result, unmount } = renderHook(() => useSession())
    await waitFor(() => expect(result.current.loading).toBe(false))

    unmount()
    expect(unsubscribe).toHaveBeenCalled()
  })
})
