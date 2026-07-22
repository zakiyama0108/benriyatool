import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LoginStatus from '../../../app/life-money-sim/components/LoginStatus'
import type { Session } from '@supabase/supabase-js'

function makeSession(email: string): Session {
  return {
    user: { email },
  } as Session
}

// 仕様: specs/life-money-sim/user-auth/requirements.md#ログイン・ログアウト-1、specs/life-money-sim/user-auth/requirements.md#ログイン・ログアウト-2
describe('【利用者】未ログイン時の表示 - Googleでログインする操作のみを表示する', () => {
  it('未ログインのとき、「Googleでログイン」ボタンが表示され、押すとログイン開始が呼ばれること', () => {
    const onLoginClick = vi.fn()
    render(<LoginStatus session={null} onLoginClick={onLoginClick} onLogoutClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Googleでログイン' }))
    expect(onLoginClick).toHaveBeenCalled()
  })

  it('未ログインのとき、ログアウトボタンやアカウント表示は出ないこと', () => {
    render(<LoginStatus session={null} onLoginClick={vi.fn()} onLogoutClick={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'ログアウト' })).toBeNull()
  })
})

// 仕様: specs/life-money-sim/user-auth/requirements.md#ログイン・ログアウト-3、specs/life-money-sim/user-auth/requirements.md#ログイン・ログアウト-4
describe('【利用者】ログイン中の表示 - アカウント表示とログアウト操作を出す', () => {
  it('ログイン中のとき、アカウント(メールアドレス)とログアウトボタンが表示され、押すとログアウトが呼ばれること', () => {
    const onLogoutClick = vi.fn()
    render(<LoginStatus session={makeSession('taro@example.com')} onLoginClick={vi.fn()} onLogoutClick={onLogoutClick} />)
    expect(screen.getByText('taro@example.com')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(onLogoutClick).toHaveBeenCalled()
  })

  it('ログイン中のとき、「Googleでログイン」ボタンは出ないこと', () => {
    render(<LoginStatus session={makeSession('taro@example.com')} onLoginClick={vi.fn()} onLogoutClick={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Googleでログイン' })).toBeNull()
  })
})
