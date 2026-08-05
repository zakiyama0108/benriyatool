import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import BookmarkListView from '../../../app/ai-dev-digest/components/BookmarkListView'
import { getSession, onAuthChange } from '../../../app/lib/adminAuth'
import { fetchAllBookmarks } from '../../../app/ai-dev-digest/lib/bookmarks'

vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
}))
vi.mock('../../../app/ai-dev-digest/lib/bookmarks', () => ({
  fetchAllBookmarks: vi.fn(),
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))

const getSessionMock = vi.mocked(getSession)
const onAuthChangeMock = vi.mocked(onAuthChange)
const fetchAllBookmarksMock = vi.mocked(fetchAllBookmarks)

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

const topicIndex = {
  '2026-08-01:topic-1': { articleTitle: '2026年8月1日のAIニュース', topicHeading: 'Anthropicが新モデルを発表' },
  '2026-07-31:topic-2': { articleTitle: '2026年7月31日のAIニュース', topicHeading: 'Geminiのアップデート' },
}

beforeEach(() => {
  getSessionMock.mockReset()
  onAuthChangeMock.mockReset().mockReturnValue(() => {})
  fetchAllBookmarksMock.mockReset()
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#付箋した記事一覧-10
describe('付箋一覧ページ - 未ログインの場合はログインを促す表示のみで一覧を取得しない', () => {
  it('セッションがない場合、一覧は取得されず、ログインを促す表示(ログイン操作)が表示されること', async () => {
    getSessionMock.mockResolvedValue(null)
    render(<BookmarkListView topicIndex={topicIndex} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /ログイン/ })).toBeTruthy())
    expect(fetchAllBookmarksMock).not.toHaveBeenCalled()
  })
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#付箋した記事一覧-10、specs/ai-dev-digest/bookmark/requirements.md#付箋した記事一覧-14
describe('付箋一覧ページ - ログイン中は自分の付箋一覧を表示する', () => {
  it('付箋が0件の場合、「まだ付箋がありません」の案内が表示されること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchAllBookmarksMock.mockResolvedValue([])
    render(<BookmarkListView topicIndex={topicIndex} />)
    await waitFor(() => expect(screen.getByText(/まだ付箋がありません/)).toBeTruthy())
  })

  it('1件以上の場合、updated_atの新しい順(fetchAllBookmarksが返した順)でBookmarkListItemが並ぶこと', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchAllBookmarksMock.mockResolvedValue([
      { id: 'a', articleDate: '2026-08-01', topicId: 'topic-1', memo: '新しい付箋' },
      { id: 'b', articleDate: '2026-07-31', topicId: 'topic-2', memo: '古い付箋' },
    ])
    render(<BookmarkListView topicIndex={topicIndex} />)
    await waitFor(() => expect(screen.getByText('新しい付箋')).toBeTruthy())
    const items = screen.getAllByText(/付箋$/)
    expect(items.map((el) => el.textContent)).toEqual(['新しい付箋', '古い付箋'])
  })

  it('topicIndexに対応するキーが無い付箋は一覧から除外されること(存在しないリンク先を作らないため)', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchAllBookmarksMock.mockResolvedValue([
      { id: 'a', articleDate: '2026-08-01', topicId: 'topic-1', memo: '存在するトピックの付箋' },
      { id: 'b', articleDate: '2026-08-01', topicId: 'topic-999', memo: '存在しないトピックの付箋' },
    ])
    render(<BookmarkListView topicIndex={topicIndex} />)
    await waitFor(() => expect(screen.getByText('存在するトピックの付箋')).toBeTruthy())
    expect(screen.queryByText('存在しないトピックの付箋')).toBeNull()
  })
})

// 仕様: specs/ai-dev-digest/bookmark/design.md「付箋一覧を取得して表示する処理」
describe('付箋一覧ページ - セッション確認中・取得中はローディング表示のみを行う', () => {
  it('セッション確認中は、ログイン導線・一覧のどちらも表示されず、読み込み中の表示のみが出ること', () => {
    getSessionMock.mockReturnValue(new Promise(() => {}))
    render(<BookmarkListView topicIndex={topicIndex} />)
    expect(screen.getByText(/読み込み中/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /ログイン/ })).toBeNull()
    expect(screen.queryByText(/まだ付箋がありません/)).toBeNull()
  })

  it('セッションはあるが付箋取得中は、0件表示・一覧のどちらも出さず読み込み中の表示のみが出ること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchAllBookmarksMock.mockReturnValue(new Promise(() => {}))
    render(<BookmarkListView topicIndex={topicIndex} />)
    await waitFor(() => expect(fetchAllBookmarksMock).toHaveBeenCalled())
    expect(screen.getByText(/読み込み中/)).toBeTruthy()
    expect(screen.queryByText(/まだ付箋がありません/)).toBeNull()
  })
})
