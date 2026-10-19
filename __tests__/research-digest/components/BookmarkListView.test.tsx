import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import BookmarkListView from '../../../app/research-digest/components/BookmarkListView'
import { getSession, onAuthChange } from '../../../app/lib/adminAuth'
import { fetchAllBookmarks, deleteBookmark } from '../../../app/research-digest/lib/bookmarks'

vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
}))
vi.mock('../../../app/research-digest/lib/bookmarks', () => ({
  fetchAllBookmarks: vi.fn(),
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))

const getSessionMock = vi.mocked(getSession)
const onAuthChangeMock = vi.mocked(onAuthChange)
const fetchAllBookmarksMock = vi.mocked(fetchAllBookmarks)
const deleteBookmarkMock = vi.mocked(deleteBookmark)

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

const findingIndex = {
  '2026-10-05:ai-it': { heading: 'AIの研究', genre: 'ai-it' },
  '2026-09-28:medical-health': { heading: '医療の研究', genre: 'medical-health' },
}

beforeEach(() => {
  getSessionMock.mockReset()
  onAuthChangeMock.mockReset().mockReturnValue(() => {})
  fetchAllBookmarksMock.mockReset()
  deleteBookmarkMock.mockReset()
})

// 仕様: specs/research-digest/bookmark/requirements.md#付箋の一覧-9
describe('付箋一覧ページ - 未ログインの場合はログインを促す表示のみで一覧を取得しない', () => {
  it('ログインしていない場合、一覧は取得されず、ログインを促す表示(ログイン操作)が表示されること', async () => {
    getSessionMock.mockResolvedValue(null)
    render(<BookmarkListView findingIndex={findingIndex} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /ログイン/ })).toBeTruthy())
    expect(fetchAllBookmarksMock).not.toHaveBeenCalled()
  })
})

// 仕様: specs/research-digest/bookmark/requirements.md#付箋の一覧-9、specs/research-digest/bookmark/requirements.md#付箋の一覧-13、specs/research-digest/bookmark/requirements.md#付箋の一覧-14
describe('付箋一覧ページ - ログイン中は自分の付箋一覧を表示する', () => {
  it('付箋が0件の場合、「まだ付箋がありません」の案内が表示されること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchAllBookmarksMock.mockResolvedValue([])
    render(<BookmarkListView findingIndex={findingIndex} />)
    await waitFor(() => expect(screen.getByText(/まだ付箋がありません/)).toBeTruthy())
  })

  it('1件以上の場合、最後に編集した日時の新しい順(取得した順)で付箋が並ぶこと', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchAllBookmarksMock.mockResolvedValue([
      { id: 'a', articleId: '2026-10-05', findingId: 'ai-it', memo: '新しい付箋' },
      { id: 'b', articleId: '2026-09-28', findingId: 'medical-health', memo: '古い付箋' },
    ])
    render(<BookmarkListView findingIndex={findingIndex} />)
    await waitFor(() => expect(screen.getByText('新しい付箋')).toBeTruthy())
    const items = screen.getAllByText(/付箋$/)
    expect(items.map((el) => el.textContent)).toEqual(['新しい付箋', '古い付箋'])
  })

  it('記事データに見つからない研究の付箋は一覧から除外されること(存在しないリンク先を作らないため)', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchAllBookmarksMock.mockResolvedValue([
      { id: 'a', articleId: '2026-10-05', findingId: 'ai-it', memo: '存在する研究の付箋' },
      { id: 'b', articleId: '2026-10-05', findingId: 'other', memo: '存在しない研究の付箋' },
    ])
    render(<BookmarkListView findingIndex={findingIndex} />)
    await waitFor(() => expect(screen.getByText('存在する研究の付箋')).toBeTruthy())
    expect(screen.queryByText('存在しない研究の付箋')).toBeNull()
  })

  it('付箋の取得に失敗した場合は、エラーを出さず0件として「まだ付箋がありません」が表示されること', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchAllBookmarksMock.mockRejectedValue(new Error('network error'))
    render(<BookmarkListView findingIndex={findingIndex} />)
    await waitFor(() => expect(screen.getByText(/まだ付箋がありません/)).toBeTruthy())
    spy.mockRestore()
  })

  it('付箋を削除すると、その項目が一覧から消えること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchAllBookmarksMock.mockResolvedValue([
      { id: 'a', articleId: '2026-10-05', findingId: 'ai-it', memo: '新しい付箋' },
      { id: 'b', articleId: '2026-09-28', findingId: 'medical-health', memo: '古い付箋' },
    ])
    deleteBookmarkMock.mockResolvedValue(true)
    render(<BookmarkListView findingIndex={findingIndex} />)
    await waitFor(() => expect(screen.getByText('新しい付箋')).toBeTruthy())

    fireEvent.click(screen.getAllByRole('button', { name: '削除' })[0])

    await waitFor(() => expect(screen.queryByText('新しい付箋')).toBeNull())
    expect(screen.getByText('古い付箋')).toBeTruthy()
  })
})

// 仕様: specs/research-digest/bookmark/design.md「付箋一覧を表示する処理」
describe('付箋一覧ページ - セッション確認中・取得中はローディング表示のみを行う', () => {
  it('ログイン状態の確認中は、ログイン導線・一覧のどちらも表示されず、読み込み中の表示のみが出ること', () => {
    getSessionMock.mockReturnValue(new Promise(() => {}))
    render(<BookmarkListView findingIndex={findingIndex} />)
    expect(screen.getByText(/読み込み中/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /ログイン/ })).toBeNull()
    expect(screen.queryByText(/まだ付箋がありません/)).toBeNull()
  })

  it('ログイン済みだが付箋の取得中は、0件表示・一覧のどちらも出さず読み込み中の表示のみが出ること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchAllBookmarksMock.mockReturnValue(new Promise(() => {}))
    render(<BookmarkListView findingIndex={findingIndex} />)
    await waitFor(() => expect(fetchAllBookmarksMock).toHaveBeenCalled())
    expect(screen.getByText(/読み込み中/)).toBeTruthy()
    expect(screen.queryByText(/まだ付箋がありません/)).toBeNull()
  })
})
