import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import LoginStatus from '../../../app/board-game-rules/components/LoginStatus'
import { useSession } from '../../../app/board-game-rules/lib/useSession'
import * as adminAuth from '../../../app/lib/adminAuth'

// セッション状態はuseSessionから、ログイン開始・ログアウトはadminAuthから来るため、
// いずれもモックして「表示の出し分けと操作の呼び出し」だけを検証する
vi.mock('../../../app/board-game-rules/lib/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../../app/lib/adminAuth', () => ({ signInWithGoogle: vi.fn(), signOut: vi.fn() }))

function makeSession(name: string, email: string): Session {
  return { user: { email, user_metadata: { full_name: name } } } as unknown as Session
}

// 仕様: specs/board-game-rules/user-auth/requirements.md#ログイン・ログアウト-1、specs/board-game-rules/user-auth/requirements.md#ログイン・ログアウト-2
describe('【共通ヘッダー】未ログイン時のログイン導線 - Googleでログインする操作のみを表示する', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未ログインのとき、「Googleでログイン」ボタンが表示され、押すと現在URLを戻り先にログインが開始されること', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })

    render(<LoginStatus />)

    fireEvent.click(screen.getByRole('button', { name: 'Googleでログイン' }))
    expect(adminAuth.signInWithGoogle).toHaveBeenCalledWith(window.location.href)
  })

  it('未ログインのとき、ログアウト操作やアカウント表示は出ないこと(閲覧・登録・通報は制限しない前提)', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })

    render(<LoginStatus />)

    expect(screen.queryByRole('button', { name: 'ログアウト' })).toBeNull()
  })
})

// 仕様: specs/board-game-rules/user-auth/requirements.md#ログイン・ログアウト-3、specs/board-game-rules/user-auth/requirements.md#ログイン・ログアウト-4
describe('【共通ヘッダー】ログイン中の表示 - アカウント名・ログアウト・お気に入り一覧導線を出す', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('ログイン中のとき、アカウント名とお気に入り一覧への導線が表示されること', () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('山田太郎', 'taro@example.com'), loading: false })

    render(<LoginStatus />)

    expect(screen.getByText('山田太郎')).toBeTruthy()
    const favLink = screen.getByRole('link', { name: 'お気に入り一覧' })
    expect(favLink.getAttribute('href')).toBe('/board-game-rules/favorites')
  })

  it('ログイン中のとき、ログアウトを押すとログアウトが呼ばれ、「Googleでログイン」は出ないこと', () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('山田太郎', 'taro@example.com'), loading: false })

    render(<LoginStatus />)

    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(adminAuth.signOut).toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Googleでログイン' })).toBeNull()
  })
})
