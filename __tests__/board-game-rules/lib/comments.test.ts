import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fromMock, getUserMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getUserMock: vi.fn(),
}))
vi.mock('../../../app/lib/supabaseClient', () => ({
  supabase: { from: fromMock, auth: { getUser: getUserMock } },
}))

import { fetchComments, createComment, updateComment, deleteComment } from '../../../app/board-game-rules/lib/comments'

type QueryResult = { data: unknown; error: unknown }

// board_game_rules_comments へのSELECT(一覧)・INSERT(投稿)・UPDATE(編集)・DELETE(削除)を
// テーブル操作ごとに出し分けるモック(favorites.test.ts・fetchAdminGames.test.tsと同じ方針)
function setupFrom(options: {
  selectResult?: QueryResult
  insertSingleResult?: QueryResult
  updateEqMock?: ReturnType<typeof vi.fn>
  deleteEqMock?: ReturnType<typeof vi.fn>
}) {
  const insertSingleResult = options.insertSingleResult ?? { data: null, error: null }
  const updateEqMock = options.updateEqMock ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const deleteEqMock = options.deleteEqMock ?? vi.fn().mockResolvedValue({ data: null, error: null })
  // INSERT時に実際に渡された値を検証できるよう捕捉する
  const insertMock = vi.fn(() => ({
    select: () => ({ single: () => Promise.resolve(insertSingleResult) }),
  }))
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))

  fromMock.mockImplementation((table: string) => {
    if (table !== 'board_game_rules_comments') throw new Error(`unexpected table: ${table}`)
    return {
      select: () => ({ eq: () => ({ order: () => Promise.resolve(options.selectResult) }) }),
      insert: insertMock,
      update: updateMock,
      delete: () => ({ eq: deleteEqMock }),
    }
  })

  return { insertMock, updateMock, updateEqMock, deleteEqMock }
}

function makeCommentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'comment-1',
    game_id: 'game-1',
    user_id: 'user-1',
    author_name: '山田太郎',
    body: 'このルールは補足が必要です',
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  fromMock.mockReset()
  getUserMock.mockReset().mockResolvedValue({
    data: { user: { id: 'user-1', email: 'taro@example.com', user_metadata: { full_name: '山田太郎' } } },
    error: null,
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの表示-1、specs/board-game-rules/comment/requirements.md#コメントの表示-4
describe('コメント一覧の取得 - 対象ゲームのコメントを投稿日時の古い順に取得する', () => {
  it('対象ゲームのコメントが、投稿日時の昇順(古い順)で取得され、表示名・本文を持つ形に変換されて返ること', async () => {
    setupFrom({
      selectResult: {
        data: [makeCommentRow({ id: 'c-1', body: '古いコメント' }), makeCommentRow({ id: 'c-2', body: '新しいコメント' })],
        error: null,
      },
    })

    const result = await fetchComments('game-1')

    expect(fromMock).toHaveBeenCalledWith('board_game_rules_comments')
    expect(result.map((c) => c.id)).toEqual(['c-1', 'c-2'])
    expect(result[0].authorName).toBe('山田太郎')
    expect(result[0].body).toBe('古いコメント')
  })

  it('取得に失敗した場合、コメント欄がエラー表示に切り替えられるよう例外を投げること', async () => {
    setupFrom({ selectResult: { data: null, error: { message: 'network error' } } })

    await expect(fetchComments('game-1')).rejects.toThrow()
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの投稿-5、specs/board-game-rules/comment/requirements.md#コメントの投稿-6、specs/board-game-rules/comment/requirements.md#コメントの投稿-7
describe('コメントの投稿 - ログイン中の本人のuser_idとセッション由来の表示名で新規投稿する', () => {
  it('投稿に成功した場合、本人のuser_id・セッションの表示名・本文でINSERTされ、作成されたコメントが返ること', async () => {
    const { insertMock } = setupFrom({ insertSingleResult: { data: makeCommentRow(), error: null } })

    const result = await createComment('game-1', 'このルールは補足が必要です')

    expect(insertMock).toHaveBeenCalledWith({
      game_id: 'game-1',
      user_id: 'user-1',
      author_name: '山田太郎',
      body: 'このルールは補足が必要です',
    })
    expect(result?.id).toBe('comment-1')
  })

  it('表示名(full_name)が無いアカウントでは、代替としてメールアドレスが表示名として保存されること', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'taro@example.com', user_metadata: {} } },
      error: null,
    })
    const { insertMock } = setupFrom({ insertSingleResult: { data: makeCommentRow(), error: null } })

    await createComment('game-1', '本文')

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ author_name: 'taro@example.com' }))
  })

  it('本文の前後の空白は取り除いて保存されること', async () => {
    const { insertMock } = setupFrom({ insertSingleResult: { data: makeCommentRow(), error: null } })

    await createComment('game-1', '  余白付き本文  ')

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ body: '余白付き本文' }))
  })

  it('本文が空白のみの場合は投稿せず、INSERTを呼ばずにnullを返すこと', async () => {
    const { insertMock } = setupFrom({})

    const result = await createComment('game-1', '   ')

    expect(insertMock).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('本文が文字数上限(2000文字)を超える場合は投稿せず、INSERTを呼ばずにnullを返すこと', async () => {
    const { insertMock } = setupFrom({})

    const result = await createComment('game-1', 'あ'.repeat(2001))

    expect(insertMock).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('未ログイン(ユーザーが取得できない)の場合は投稿せずnullを返すこと', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null })
    const { insertMock } = setupFrom({})

    const result = await createComment('game-1', '本文')

    expect(insertMock).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('Supabaseが{error}を返した場合、nullが返ること', async () => {
    setupFrom({ insertSingleResult: { data: null, error: { message: 'permission denied' } } })

    await expect(createComment('game-1', '本文')).resolves.toBeNull()
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの編集・削除-9
describe('コメントの編集 - 該当コメント1行の本文を上書き更新する', () => {
  it('編集に成功した場合、trueが返り、対象idの行の本文がUPDATEされること', async () => {
    const { updateMock, updateEqMock } = setupFrom({})

    const result = await updateComment('comment-1', '修正後の本文')

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ body: '修正後の本文' }))
    expect(updateEqMock).toHaveBeenCalledWith('id', 'comment-1')
    expect(result).toBe(true)
  })

  it('本文が空白のみの場合はUPDATEを呼ばずfalseを返すこと(投稿と同じ検証)', async () => {
    const { updateMock } = setupFrom({})

    const result = await updateComment('comment-1', '   ')

    expect(updateMock).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it('本文が上限を超える場合はUPDATEを呼ばずfalseを返すこと', async () => {
    const { updateMock } = setupFrom({})

    const result = await updateComment('comment-1', 'あ'.repeat(2001))

    expect(updateMock).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    setupFrom({ updateEqMock: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } }) })

    await expect(updateComment('comment-1', '本文')).resolves.toBe(false)
  })
})

// 仕様: specs/board-game-rules/comment/requirements.md#コメントの編集・削除-9、specs/board-game-rules/comment/requirements.md#コメントの編集・削除-10
describe('コメントの削除 - 本人または運営者が該当コメントを削除する(可否はRLSで担保)', () => {
  it('削除に成功した場合、trueが返り、対象idの行がDELETEされること', async () => {
    const { deleteEqMock } = setupFrom({})

    const result = await deleteComment('comment-1')

    expect(deleteEqMock).toHaveBeenCalledWith('id', 'comment-1')
    expect(result).toBe(true)
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    setupFrom({ deleteEqMock: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } }) })

    await expect(deleteComment('comment-1')).resolves.toBe(false)
  })

  it('削除処理が例外を投げた場合も、falseで正常終了すること', async () => {
    setupFrom({
      deleteEqMock: vi.fn(() => {
        throw new Error('network error')
      }),
    })

    await expect(deleteComment('comment-1')).resolves.toBe(false)
  })
})
