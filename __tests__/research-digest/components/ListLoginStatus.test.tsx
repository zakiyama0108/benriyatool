import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import ListLoginStatus from '../../../app/research-digest/components/ListLoginStatus'
import { getSession, onAuthChange } from '../../../app/lib/adminAuth'

vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}))

const getSessionMock = vi.mocked(getSession)
const onAuthChangeMock = vi.mocked(onAuthChange)

beforeEach(() => {
  getSessionMock.mockReset()
  onAuthChangeMock.mockReset().mockReturnValue(() => {})
})

// 仕様: specs/research-digest/article-list/design.md「画面設計」
describe('記事一覧ページ下部のログイン状態表示 - ログイン中は付箋一覧への導線を出す', () => {
  it('ログインしていない場合は「ログイン」だけが表示されること', async () => {
    getSessionMock.mockResolvedValue(null)
    render(<ListLoginStatus />)
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: '付箋一覧' })).toBeNull()
  })

  it('ログイン中は「付箋一覧」へのリンクが表示されること', async () => {
    getSessionMock.mockResolvedValue({ user: { email: 'reader@example.com' } } as Session)
    render(<ListLoginStatus />)
    const link = await screen.findByRole('link', { name: '付箋一覧' })
    expect(link.getAttribute('href')).toBe('/research-digest/bookmarks')
  })

  it('ログイン状態の確認に失敗した場合は、未ログインとして扱うこと', async () => {
    getSessionMock.mockRejectedValue(new Error('network error'))
    render(<ListLoginStatus />)
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeTruthy()
  })
})
