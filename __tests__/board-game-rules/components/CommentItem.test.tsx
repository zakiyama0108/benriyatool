import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CommentItem from '../../../app/board-game-rules/components/CommentItem'
import type { Comment } from '../../../app/board-game-rules/lib/comments'
import { updateComment, deleteComment } from '../../../app/board-game-rules/lib/comments'

// 編集・削除のDB操作はlib/commentsから来るためモックし、
// 「権限に応じた操作の出し分けと、編集/削除の呼び出し・一覧反映」だけを検証する
vi.mock('../../../app/board-game-rules/lib/comments', () => ({
  updateComment: vi.fn(),
  deleteComment: vi.fn(),
}))

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 'comment-1',
    gameId: 'game-1',
    userId: 'user-1',
    authorName: '山田太郎',
    body: 'このルールは補足が必要です',
    createdAt: '2026-08-01T09:30:00.000Z',
    updatedAt: '2026-08-01T09:30:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの表示-2
describe('コメント1件の表示 - 投稿者名・投稿日時・本文を表示する', () => {
  it('投稿者の表示名と本文が表示されること', () => {
    render(<CommentItem comment={makeComment()} isOwn={false} isAdmin={false} onUpdated={vi.fn()} onDeleted={vi.fn()} />)

    expect(screen.getByText('山田太郎')).toBeTruthy()
    expect(screen.getByText('このルールは補足が必要です')).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの編集・削除-9、specs/board-game-rules/comment/requirements.md#コメントの編集・削除-10、specs/board-game-rules/comment/requirements.md#コメントの編集・削除-11
describe('コメント1件の操作の出し分け - 本人には編集・削除、運営者には削除のみ、他人には出さない', () => {
  it('投稿者本人には「編集」「削除」の両方が表示されること', () => {
    render(<CommentItem comment={makeComment()} isOwn={true} isAdmin={false} onUpdated={vi.fn()} onDeleted={vi.fn()} />)

    expect(screen.getByRole('button', { name: '編集' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '削除' })).toBeTruthy()
  })

  it('運営者(本人ではない)には「削除」だけが表示され、「編集」は表示されないこと(他人の発言は書き換えない)', () => {
    render(<CommentItem comment={makeComment()} isOwn={false} isAdmin={true} onUpdated={vi.fn()} onDeleted={vi.fn()} />)

    expect(screen.getByRole('button', { name: '削除' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
  })

  it('本人でも運営者でもない利用者には、編集・削除のどちらも表示されないこと', () => {
    render(<CommentItem comment={makeComment()} isOwn={false} isAdmin={false} onUpdated={vi.fn()} onDeleted={vi.fn()} />)

    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
    expect(screen.queryByRole('button', { name: '編集' })).toBeNull()
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの編集・削除-9、specs/board-game-rules/comment/requirements.md#コメントの投稿-6、specs/board-game-rules/comment/requirements.md#コメントの投稿-7
describe('コメントの編集 - 本人が本文を編集して保存し、成功したら更新後の本文を表示する', () => {
  it('「編集」で本文の入力欄が保存済み本文を初期値にして開くこと', () => {
    render(<CommentItem comment={makeComment()} isOwn={true} isAdmin={false} onUpdated={vi.fn()} onDeleted={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '編集' }))

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
    expect(textarea.value).toBe('このルールは補足が必要です')
  })

  it('本文を書き換えて保存すると updateComment が呼ばれ、成功したら表示へ反映され親へ通知されること', async () => {
    vi.mocked(updateComment).mockResolvedValue(true)
    const onUpdated = vi.fn()
    render(<CommentItem comment={makeComment()} isOwn={true} isAdmin={false} onUpdated={onUpdated} onDeleted={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '修正後の本文' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    expect(updateComment).toHaveBeenCalledWith('comment-1', '修正後の本文')
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith('comment-1', '修正後の本文'))
    await waitFor(() => expect(screen.getByText('修正後の本文')).toBeTruthy())
  })

  it('編集本文が空白のみのときは保存操作が無効化され、updateCommentが呼ばれないこと', () => {
    render(<CommentItem comment={makeComment()} isOwn={true} isAdmin={false} onUpdated={vi.fn()} onDeleted={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '   ' } })

    expect((screen.getByRole('button', { name: '保存' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('編集に失敗した場合、入力欄は開いたまま失敗が分かる表示が出て入力が保持されること', async () => {
    vi.mocked(updateComment).mockResolvedValue(false)
    render(<CommentItem comment={makeComment()} isOwn={true} isAdmin={false} onUpdated={vi.fn()} onDeleted={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '修正後の本文' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(screen.getByText(/失敗/)).toBeTruthy())
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('修正後の本文')
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの編集・削除-9
describe('コメントの削除 - 削除に成功したら一覧から取り除き、失敗したら残して失敗表示する', () => {
  it('「削除」で deleteComment が呼ばれ、成功したら親へ削除が通知されること', async () => {
    vi.mocked(deleteComment).mockResolvedValue(true)
    const onDeleted = vi.fn()
    render(<CommentItem comment={makeComment()} isOwn={true} isAdmin={false} onUpdated={vi.fn()} onDeleted={onDeleted} />)

    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    expect(deleteComment).toHaveBeenCalledWith('comment-1')
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith('comment-1'))
  })

  it('削除に失敗した場合、親へ通知されず失敗が分かる表示が出ること', async () => {
    vi.mocked(deleteComment).mockResolvedValue(false)
    const onDeleted = vi.fn()
    render(<CommentItem comment={makeComment()} isOwn={true} isAdmin={false} onUpdated={vi.fn()} onDeleted={onDeleted} />)

    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    await waitFor(() => expect(screen.getByText(/失敗/)).toBeTruthy())
    expect(onDeleted).not.toHaveBeenCalled()
  })
})
