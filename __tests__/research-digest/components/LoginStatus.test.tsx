import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import LoginStatus from '../../../app/research-digest/components/LoginStatus'

// 仕様: specs/research-digest/article-detail/design.md「画面設計」
describe('ページ下部のログイン状態表示 - 未ログイン/ログイン中で表示を切り替える', () => {
  it('未ログイン時は「ログイン」ボタンのみが表示され、押すとログイン操作が呼ばれること', () => {
    const onLoginClick = vi.fn()
    render(<LoginStatus session={null} onLoginClick={onLoginClick} onLogoutClick={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }))
    expect(onLoginClick).toHaveBeenCalled()
  })

  it('ログイン中はメールアドレスとログアウトボタンが表示され、ログアウトを押すとログアウト操作が呼ばれること', () => {
    const onLogoutClick = vi.fn()
    const session = { user: { email: 'reader@example.com' } } as Session
    render(<LoginStatus session={session} onLoginClick={vi.fn()} onLogoutClick={onLogoutClick} />)
    expect(screen.getByText('reader@example.com')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(onLogoutClick).toHaveBeenCalled()
  })
})
