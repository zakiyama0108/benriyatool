import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LoginScreen from '../../../../app/life-money-sim/admin/components/LoginScreen'

// 仕様: specs/life-money-sim/admin/requirements.md#ログイン・アクセス制御-1
describe('【管理】ログイン案内 - 未ログイン時にログインを促す', () => {
  it('未ログインのとき、Googleでログインするボタンが表示され、押すとログインが始まること', () => {
    const onLogin = vi.fn()
    render(<LoginScreen variant="login" onLogin={onLogin} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Googleでログイン' }))
    expect(onLogin).toHaveBeenCalled()
  })

  it('未ログインのとき、データは一切表示されないこと(案内のみ)', () => {
    render(<LoginScreen variant="login" onLogin={vi.fn()} onLogout={vi.fn()} />)
    expect(screen.queryByRole('table')).toBeNull()
  })
})

// 仕様: specs/life-money-sim/admin/requirements.md#ログイン・アクセス制御-3
describe('【管理】権限なしの案内 - 運営者以外がログインしたときに閲覧できない旨を出す', () => {
  it('権限がないとき、閲覧できない旨とログアウト手段が表示されること', () => {
    const onLogout = vi.fn()
    render(<LoginScreen variant="denied" onLogin={vi.fn()} onLogout={onLogout} />)
    expect(screen.getByText(/権限がありません/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(onLogout).toHaveBeenCalled()
  })
})
