import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import LoginScreen from '../../../../app/board-game-rules/admin/components/LoginScreen'

// 仕様: specs/board-game-rules/admin/requirements.md#ログイン・アクセス制御-1
describe('【管理画面】ログイン案内 - 未ログイン時にログインを促す', () => {
  it('未ログインのとき、Googleでログインするボタンが表示され、押すとログインが始まること', () => {
    const onLogin = vi.fn()
    render(<LoginScreen variant="login" onLogin={onLogin} onLogout={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Googleでログイン' }))
    expect(onLogin).toHaveBeenCalled()
  })

  it('未ログインのとき、管理機能・データは一切表示されないこと(案内のみ)', () => {
    render(<LoginScreen variant="login" onLogin={vi.fn()} onLogout={vi.fn()} />)
    expect(screen.queryByRole('table')).toBeNull()
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#ログイン・アクセス制御-3
describe('【管理画面】権限なしの案内 - 運営者以外がログインしたときに閲覧できない旨を出す', () => {
  it('権限がないとき、操作する権限がない旨とログアウト手段が表示されること', () => {
    const onLogout = vi.fn()
    render(<LoginScreen variant="denied" onLogin={vi.fn()} onLogout={onLogout} />)
    expect(screen.getByText(/権限がありません/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(onLogout).toHaveBeenCalled()
  })
})
