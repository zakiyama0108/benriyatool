import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import CommentSection from '../../../app/board-game-rules/components/CommentSection'
import type { Comment } from '../../../app/board-game-rules/lib/comments'
import { fetchComments, createComment } from '../../../app/board-game-rules/lib/comments'
import { useSession } from '../../../app/board-game-rules/lib/useSession'
import { isAuthorizedAdmin } from '../../../app/lib/adminAuth'

// 一覧取得・投稿はlib/commentsから、ログイン状態はuseSessionから、運営者判定はadminAuthから来る。
// いずれもモックして「取得・表示・投稿フォームの出し分け・権限に応じた操作の出し分け」を検証する
vi.mock('../../../app/board-game-rules/lib/comments', () => ({
  fetchComments: vi.fn(),
  createComment: vi.fn(),
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}))
vi.mock('../../../app/board-game-rules/lib/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../../app/lib/adminAuth', () => ({ isAuthorizedAdmin: vi.fn() }))

function makeSession(userId: string, fullName?: string): Session {
  return { user: { id: userId, email: `${userId}@example.com`, user_metadata: fullName ? { full_name: fullName } : {} } } as Session
}

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'comment-1',
    gameId: 'game-1',
    userId: 'user-1',
    authorName: '山田太郎',
    body: '本文です',
    createdAt: '2026-08-01T09:30:00.000Z',
    updatedAt: '2026-08-01T09:30:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetchComments).mockResolvedValue([])
  vi.mocked(isAuthorizedAdmin).mockResolvedValue(false)
  vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの表示-1、specs/board-game-rules/comment/requirements.md#コメントの表示-3
describe('コメント欄 - 対象ゲームのコメント一覧を取得して表示する(閲覧はログイン不要)', () => {
  it('対象ゲームのコメントを取得し、各コメントの本文が表示されること', async () => {
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ id: 'c-1', body: '1件目' }), makeComment({ id: 'c-2', body: '2件目' })])

    render(<CommentSection gameId="game-1" />)

    expect(fetchComments).toHaveBeenCalledWith('game-1')
    await waitFor(() => expect(screen.getByText('1件目')).toBeTruthy())
    expect(screen.getByText('2件目')).toBeTruthy()
  })

  it('取得に失敗した場合、コメント欄にエラーが分かる表示が出ること', async () => {
    vi.mocked(fetchComments).mockRejectedValue(new Error('network error'))

    render(<CommentSection gameId="game-1" />)

    await waitFor(() => expect(screen.getByText(/取得|失敗|エラー/)).toBeTruthy())
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの投稿-8
describe('コメント欄 - 投稿フォームはログイン中のみ表示する(未ログインには出さない)', () => {
  it('未ログインのときは投稿フォーム(入力欄)を表示しないこと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })

    render(<CommentSection gameId="game-1" />)

    await waitFor(() => expect(fetchComments).toHaveBeenCalled())
    expect(screen.queryByPlaceholderText(/コメント/)).toBeNull()
  })

  it('ログイン中のときは投稿フォームを表示すること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('user-1', '山田太郎'), loading: false })

    render(<CommentSection gameId="game-1" />)

    await waitFor(() => expect(screen.getByPlaceholderText(/コメント/)).toBeTruthy())
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#データ保護-4
describe('コメント欄 - 投稿フォームに公開される表示名を明示する(意図しない実名公開を防ぐ)', () => {
  it('実際に保存・公開される表示名(Google OIDCの氏名)がフォームに表示されること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('user-1', '山田太郎'), loading: false })

    render(<CommentSection gameId="game-1" />)

    await waitFor(() => expect(screen.getByText(/山田太郎/)).toBeTruthy())
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの投稿-5、specs/board-game-rules/comment/requirements.md#コメントの投稿-6
describe('コメント欄 - ログイン中の投稿と、空・空白・上限超過での送信無効化', () => {
  it('本文を入力して投稿すると createComment が呼ばれ、成功したら一覧へ反映され入力欄が空になること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('user-1', '山田太郎'), loading: false })
    vi.mocked(createComment).mockResolvedValue(makeComment({ id: 'new-1', body: '投稿した本文', userId: 'user-1' }))

    render(<CommentSection gameId="game-1" />)
    const textarea = await screen.findByPlaceholderText(/コメント/)
    fireEvent.change(textarea, { target: { value: '投稿した本文' } })
    fireEvent.click(screen.getByRole('button', { name: '投稿' }))

    expect(createComment).toHaveBeenCalledWith('game-1', '投稿した本文')
    await waitFor(() => expect(screen.getByText('投稿した本文')).toBeTruthy())
    await waitFor(() => expect((textarea as HTMLTextAreaElement).value).toBe(''))
  })

  it('本文が空白のみのときは投稿ボタンが無効化されること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('user-1', '山田太郎'), loading: false })

    render(<CommentSection gameId="game-1" />)
    const textarea = await screen.findByPlaceholderText(/コメント/)
    fireEvent.change(textarea, { target: { value: '   ' } })

    expect((screen.getByRole('button', { name: '投稿' }) as HTMLButtonElement).disabled).toBe(true)
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの編集・削除-9、specs/board-game-rules/comment/requirements.md#コメントの編集・削除-10
describe('コメント欄 - 権限に応じて各コメントの操作を出し分ける(本人は編集・削除、運営者は削除)', () => {
  it('ログイン中の自分のコメントには編集・削除が出ること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('user-1', '山田太郎'), loading: false })
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ id: 'c-1', userId: 'user-1' })])

    render(<CommentSection gameId="game-1" />)

    await waitFor(() => expect(screen.getByRole('button', { name: '編集' })).toBeTruthy())
    expect(screen.getByRole('button', { name: '削除' })).toBeTruthy()
  })

  it('運営者ログイン時は、他人のコメントにも削除が出る(編集は出ない)こと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('admin-1', '運営者'), loading: false })
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ id: 'c-1', userId: 'other-user' })])

    render(<CommentSection gameId="game-1" />)

    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeTruthy())
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
  })

  it('一般ログイン利用者には、他人のコメントに編集・削除が出ないこと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('user-2', '別の人'), loading: false })
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ id: 'c-1', userId: 'other-user' })])

    render(<CommentSection gameId="game-1" />)

    await waitFor(() => expect(fetchComments).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
  })

  it('運営者判定の問い合わせが失敗した場合は、運営者ではないものとして扱う(削除導線を出さない)こと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('admin-1', '運営者'), loading: false })
    vi.mocked(isAuthorizedAdmin).mockRejectedValue(new Error('network error'))
    vi.mocked(fetchComments).mockResolvedValue([makeComment({ id: 'c-1', userId: 'other-user' })])

    render(<CommentSection gameId="game-1" />)

    await waitFor(() => expect(fetchComments).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
  })
})
