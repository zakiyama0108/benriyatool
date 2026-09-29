import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import SourceDirectoryPage from '../../../../app/trend-digest/admin/sources/page'
import { getSession, onAuthChange, isAuthorizedAdmin } from '../../../../app/lib/adminAuth'

vi.mock('../../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}))

const getSessionMock = vi.mocked(getSession)
const onAuthChangeMock = vi.mocked(onAuthChange)
const isAuthorizedAdminMock = vi.mocked(isAuthorizedAdmin)

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

// getSessionを未解決のまま止め、「確認中」状態を検証するための制御可能なPromiseを作る
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  getSessionMock.mockReset()
  onAuthChangeMock.mockReset().mockReturnValue(() => {})
  isAuthorizedAdminMock.mockReset()
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

// 仕様: specs/trend-digest/source-directory/requirements.md#閲覧できる人-1、specs/trend-digest/source-directory/requirements.md#閲覧できる人-3、specs/trend-digest/source-directory/design.md「ログイン状態に応じて表示を切り替える処理」
describe('情報源一覧ページのログイン判定 - 運営者本人と判定できた場合のみ表を表示する', () => {
  it('確認中(getSession解決前)は表が描画されないこと', () => {
    const { promise } = deferred<Session | null>()
    getSessionMock.mockReturnValue(promise)
    render(<SourceDirectoryPage />)
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('未ログインのとき、ログインを促す画面が表示され、表が描画されないこと', async () => {
    getSessionMock.mockResolvedValue(null)
    render(<SourceDirectoryPage />)
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())
    expect(isAuthorizedAdminMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByRole('button', { name: /ログイン/ })).toBeTruthy()
  })

  it('運営者本人と判定されたときだけ表が描画されること', async () => {
    getSessionMock.mockResolvedValue(makeSession('admin@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(true)
    render(<SourceDirectoryPage />)
    await waitFor(() => expect(screen.getByRole('table')).toBeTruthy())
  })

  it('運営者でないときは、表を出さず閲覧できない旨が表示されること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(false)
    render(<SourceDirectoryPage />)
    await waitFor(() => expect(isAuthorizedAdminMock).toHaveBeenCalled())
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText(/権限がありません/)).toBeTruthy()
  })

  it('確認自体(isAuthorizedAdmin)が失敗したときは、表を出さずエラーである旨が表示されること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    isAuthorizedAdminMock.mockRejectedValue(new Error('network error'))
    render(<SourceDirectoryPage />)
    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled())
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText(/確認できませんでした|確認に失敗しました/)).toBeTruthy()
  })

  it('ログアウト後はログインを促す画面へ戻ること', async () => {
    getSessionMock.mockResolvedValueOnce(makeSession('admin@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(true)
    let authChangeCallback: () => void = () => {}
    onAuthChangeMock.mockImplementation((cb) => {
      authChangeCallback = cb
      return () => {}
    })
    render(<SourceDirectoryPage />)
    await waitFor(() => expect(screen.getByRole('table')).toBeTruthy())

    // ログアウトが起きるとonAuthChangeのコールバックが呼ばれ、再度getSessionを確認する想定
    getSessionMock.mockResolvedValueOnce(null)
    authChangeCallback()

    await waitFor(() => expect(screen.queryByRole('table')).toBeNull())
    expect(screen.getByRole('button', { name: /ログイン/ })).toBeTruthy()
  })
})
