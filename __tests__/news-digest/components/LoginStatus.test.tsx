import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import LoginStatus from '../../../app/news-digest/components/LoginStatus'

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

// 仕様: specs/news-digest/bookmark/requirements.md#画面共通のログイン導線-16
describe('ページ下部のログイン状態表示 - 未ログイン/ログイン中で表示を切り替える', () => {
  it('未ログイン時は、運営者限定を示さない「ログイン」ボタンのみが表示され、押すとonLoginClickが呼ばれること', () => {
    const onLoginClick = vi.fn()
    render(<LoginStatus session={null} onLoginClick={onLoginClick} onLogoutClick={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'ログイン' })
    expect(button).toBeTruthy()
    fireEvent.click(button)
    expect(onLoginClick).toHaveBeenCalled()
  })

  it('ログイン中は、メールアドレス・「付箋一覧」リンク・ログアウトボタンが表示され、ログアウトを押すとonLogoutClickが呼ばれること', () => {
    const onLogoutClick = vi.fn()
    render(<LoginStatus session={makeSession('reader@example.com')} onLoginClick={vi.fn()} onLogoutClick={onLogoutClick} />)
    expect(screen.getByText('reader@example.com')).toBeTruthy()
    const link = screen.getByRole('link', { name: '付箋一覧' })
    expect(link.getAttribute('href')).toBe('/news-digest/bookmarks')
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(onLogoutClick).toHaveBeenCalled()
  })
})
