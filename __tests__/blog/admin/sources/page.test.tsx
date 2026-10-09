import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import SourceDirectoryPage from '../../../../app/blog/admin/sources/page'
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

// 仕様: specs/blog/source-directory/requirements.md#閲覧できる人-1、specs/blog/source-directory/requirements.md#閲覧できる人-3、specs/blog/digest-hub/requirements.md#情報源一覧への導線-2
describe('情報源一覧ページ(5アプリ共通)のログイン判定 - 運営者本人と判定できた場合のみ表を表示する', () => {
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

    getSessionMock.mockResolvedValueOnce(null)
    authChangeCallback()

    await waitFor(() => expect(screen.queryByRole('table')).toBeNull())
    expect(screen.getByRole('button', { name: /ログイン/ })).toBeTruthy()
  })
})

// 仕様: specs/blog/source-directory/requirements.md#アプリ切り替えタブ-3、specs/blog/source-directory/requirements.md#アプリ切り替えタブ-1、specs/blog/source-directory/design.md#決定事項-タブの実装方式
describe('情報源一覧ページのタブ切り替え - 初期表示はai-dev-digestで、タブ操作で表示アプリが変わる', () => {
  beforeEach(() => {
    getSessionMock.mockResolvedValue(makeSession('admin@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(true)
  })

  // 仕様: specs/blog/source-directory/requirements.md#ジャンルごとの情報源・採用基準の表-5
  it('許可対象は初期表示でai-dev-digestのタブが選択され、公式組織の行が表示されること(実際のcontent/ai-dev-digest/watchlist.jsonから組み立てた行)', async () => {
    render(<SourceDirectoryPage />)
    await waitFor(() => expect(screen.getByRole('table')).toBeTruthy())

    expect(screen.getByRole('tab', { name: /AI駆動開発ダイジェスト/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('公式組織')).toBeTruthy()
  })

  it('週刊トレンドのタブへ切り替えると、週刊トレンドのジャンル(音楽)の表に変わること', async () => {
    render(<SourceDirectoryPage />)
    await waitFor(() => expect(screen.getByRole('table')).toBeTruthy())

    fireEvent.click(screen.getByRole('tab', { name: /週刊トレンド/ }))

    await waitFor(() => expect(screen.getByText('音楽')).toBeTruthy())
    expect(screen.queryByText('公式組織')).toBeNull()
  })
})
