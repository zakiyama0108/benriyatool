import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchBookmarksByArticleDate,
  fetchAllBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
} from '../../../app/ai-dev-digest/lib/bookmarks'

const {
  eqSelectMock,
  orderMock,
  selectMock,
  insertSingleMock,
  insertSelectMock,
  insertMock,
  updateEqMock,
  updateMock,
  deleteEqMock,
  fromMock,
  getUserMock,
} = vi.hoisted(() => {
  const eqSelectMock = vi.fn()
  const orderMock = vi.fn()
  const selectMock = vi.fn(() => ({ eq: eqSelectMock, order: orderMock }))
  const insertSingleMock = vi.fn()
  const insertSelectMock = vi.fn(() => ({ single: insertSingleMock }))
  const insertMock = vi.fn(() => ({ select: insertSelectMock }))
  const updateEqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))
  const deleteEqMock = vi.fn()
  const deleteMock = vi.fn(() => ({ eq: deleteEqMock }))
  const fromMock = vi.fn(() => ({ select: selectMock, insert: insertMock, update: updateMock, delete: deleteMock }))
  const getUserMock = vi.fn()
  return {
    eqSelectMock,
    orderMock,
    selectMock,
    insertSingleMock,
    insertSelectMock,
    insertMock,
    updateEqMock,
    updateMock,
    deleteEqMock,
    deleteMock,
    fromMock,
    getUserMock,
  }
})

vi.mock('../../../app/lib/supabaseClient', () => ({
  supabase: { from: fromMock, auth: { getUser: getUserMock } },
}))

beforeEach(() => {
  fromMock.mockClear()
  selectMock.mockClear()
  eqSelectMock.mockReset().mockResolvedValue({ data: [], error: null })
  orderMock.mockReset().mockResolvedValue({ data: [], error: null })
  insertMock.mockClear()
  insertSelectMock.mockClear()
  insertSingleMock.mockReset().mockResolvedValue({ data: { id: 'bookmark-1' }, error: null })
  updateEqMock.mockReset().mockResolvedValue({ data: null, error: null })
  deleteEqMock.mockReset().mockResolvedValue({ data: null, error: null })
  getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#トピックへの付箋-1、specs/ai-dev-digest/bookmark/requirements.md#表示範囲・権限-1
describe('記事内の自分の付箋の一覧取得 - 指定した記事日付の自分の付箋をトピックIDをキーにしたMapで取得する', () => {
  it('取得した付箋がトピックIDをキーにしたMap(id・memoを持つ)へ変換されること', async () => {
    eqSelectMock.mockResolvedValue({
      data: [
        { id: 'a', topic_id: 'topic-1', memo: '気になる' },
        { id: 'b', topic_id: 'topic-2', memo: 'あとで読む' },
      ],
      error: null,
    })
    const result = await fetchBookmarksByArticleDate('2026-08-01')
    expect(fromMock).toHaveBeenCalledWith('ai_dev_digest_bookmarks')
    expect(eqSelectMock).toHaveBeenCalledWith('article_date', '2026-08-01')
    expect(result).toEqual(
      new Map([
        ['topic-1', { id: 'a', memo: '気になる' }],
        ['topic-2', { id: 'b', memo: 'あとで読む' }],
      ])
    )
  })

  it('取得に失敗した場合、呼び出し元が「すべて未付箋」として扱えるよう例外を投げること', async () => {
    eqSelectMock.mockResolvedValue({ data: null, error: { message: 'network error' } })
    await expect(fetchBookmarksByArticleDate('2026-08-01')).rejects.toThrow()
  })
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#付箋した記事一覧-14
describe('付箋一覧の取得 - ログイン中の本人の付箋を更新日時の新しい順ですべて取得する', () => {
  it('取得した付箋がarticleDate・topicId・memoを持つ配列に変換され、updated_atの新しい順で問い合わせること', async () => {
    orderMock.mockResolvedValue({
      data: [{ id: 'a', article_date: '2026-08-01', topic_id: 'topic-1', memo: '気になる' }],
      error: null,
    })
    const result = await fetchAllBookmarks()
    expect(fromMock).toHaveBeenCalledWith('ai_dev_digest_bookmarks')
    expect(orderMock).toHaveBeenCalledWith('updated_at', { ascending: false })
    expect(result).toEqual([{ id: 'a', articleDate: '2026-08-01', topicId: 'topic-1', memo: '気になる' }])
  })

  it('取得に失敗した場合、呼び出し元が「0件」として扱えるよう例外を投げること', async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: 'network error' } })
    await expect(fetchAllBookmarks()).rejects.toThrow()
  })
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#トピックへの付箋-1、specs/ai-dev-digest/bookmark/requirements.md#トピックへの付箋-4、specs/ai-dev-digest/bookmark/requirements.md#文字数・件数の制約-4
describe('新規に付箋を貼る - ログイン中の本人のuser_idで記事日付・トピックID・メモを新規保存する', () => {
  it('保存に成功した場合、ログイン中の本人のuser_idで正しいカラム名でINSERTされ、新規行のidが返ること', async () => {
    const id = await createBookmark({ articleDate: '2026-08-01', topicId: 'topic-1', memo: '気になる' })
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      article_date: '2026-08-01',
      topic_id: 'topic-1',
      memo: '気になる',
    })
    expect(id).toBe('bookmark-1')
  })

  it('Supabaseが{error}を返した場合、nullが返ること', async () => {
    insertSingleMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    await expect(createBookmark({ articleDate: '2026-08-01', topicId: 'topic-1', memo: '気になる' })).resolves.toBeNull()
  })

  it('保存処理が例外を投げた場合も、nullで正常終了すること', async () => {
    insertMock.mockImplementation(() => {
      throw new Error('network error')
    })
    await expect(createBookmark({ articleDate: '2026-08-01', topicId: 'topic-1', memo: '気になる' })).resolves.toBeNull()
  })
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#付箋の編集・削除-7
describe('付箋を編集する - 既存の付箋を新しいメモ内容で上書き保存する', () => {
  it('保存に成功した場合、trueが返り、指定したidの行がmemoとupdated_at(現在時刻)で更新されること', async () => {
    const before = Date.now()
    await expect(updateBookmark('bookmark-1', '書き直した内容')).resolves.toBe(true)
    expect(updateEqMock).toHaveBeenCalledWith('id', 'bookmark-1')
    const updatePayload = updateMock.mock.calls[0][0] as { memo: string; updated_at: string }
    expect(updatePayload.memo).toBe('書き直した内容')
    expect(new Date(updatePayload.updated_at).getTime()).toBeGreaterThanOrEqual(before)
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    await expect(updateBookmark('bookmark-1', '書き直した内容')).resolves.toBe(false)
  })
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#付箋の編集・削除-8
describe('付箋を削除する - 指定した付箋を削除する', () => {
  it('削除に成功した場合、trueが返り、指定したidで削除されること', async () => {
    await expect(deleteBookmark('bookmark-1')).resolves.toBe(true)
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'bookmark-1')
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    deleteEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    await expect(deleteBookmark('bookmark-1')).resolves.toBe(false)
  })
})
