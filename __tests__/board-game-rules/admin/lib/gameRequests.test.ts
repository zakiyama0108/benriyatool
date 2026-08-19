import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  selectMock,
  orderMock,
  order2Mock,
  updateMock,
  updateEqMock,
  deleteMock,
  deleteEqMock,
  fromMock,
} = vi.hoisted(() => {
  const order2Mock = vi.fn()
  const orderMock = vi.fn(() => ({ order: order2Mock }))
  const selectMock = vi.fn(() => ({ order: orderMock }))
  const updateEqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))
  const deleteEqMock = vi.fn()
  const deleteMock = vi.fn(() => ({ eq: deleteEqMock }))
  const fromMock = vi.fn(() => ({ select: selectMock, update: updateMock, delete: deleteMock }))
  return { selectMock, orderMock, order2Mock, updateMock, updateEqMock, deleteMock, deleteEqMock, fromMock }
})
vi.mock('../../../../app/lib/supabaseClient', () => ({ supabase: { from: fromMock } }))

import {
  fetchGameRequests,
  markGameRequestProcessed,
  deleteGameRequest,
} from '../../../../app/board-game-rules/admin/lib/gameRequests'

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    photo_paths: ['req-1/0.jpg'],
    intro_photo_paths: [],
    name: 'カタン',
    min_players: 3,
    max_players: 4,
    min_minutes: 60,
    max_minutes: 90,
    genres: ['対戦'],
    min_age: null,
    difficulty: null,
    publisher: null,
    author: null,
    has_japanese_rules: null,
    awards: null,
    release_year: null,
    created_at: '2026-08-01T00:00:00.000Z',
    processed_at: null,
    ...overrides,
  }
}

beforeEach(() => {
  fromMock.mockClear()
  selectMock.mockClear()
  orderMock.mockClear()
  order2Mock.mockReset().mockResolvedValue({ data: [], error: null })
  updateMock.mockClear()
  updateEqMock.mockReset().mockResolvedValue({ data: null, error: null })
  deleteMock.mockClear()
  deleteEqMock.mockReset().mockResolvedValue({ data: null, error: null })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録依頼の確認-12、specs/board-game-rules/admin/design.md#登録依頼を確認する処理
describe('【管理画面】登録依頼一覧を取得する - 未処理を優先し、次いで新しい順に並べる', () => {
  it('未処理優先(processed_atがNULL優先)・次いで新しい順で取得すること', async () => {
    await fetchGameRequests()

    expect(fromMock).toHaveBeenCalledWith('board_game_rules_game_requests')
    expect(orderMock).toHaveBeenCalledWith('processed_at', { ascending: true, nullsFirst: true })
    expect(order2Mock).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('取得した行がcamelCaseに変換されて返ること', async () => {
    order2Mock.mockResolvedValue({ data: [makeRow()], error: null })

    const requests = await fetchGameRequests()

    expect(requests).toEqual([
      {
        id: 'req-1',
        photoPaths: ['req-1/0.jpg'],
        introPhotoPaths: [],
        name: 'カタン',
        minPlayers: 3,
        maxPlayers: 4,
        minMinutes: 60,
        maxMinutes: 90,
        genres: ['対戦'],
        minAge: null,
        difficulty: null,
        publisher: null,
        author: null,
        hasJapaneseRules: null,
        awards: null,
        releaseYear: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        processedAt: null,
      },
    ])
  })

  it('取得に失敗した場合、例外を投げて呼び出し元(画面)でエラー表示できるようにすること', async () => {
    order2Mock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    await expect(fetchGameRequests()).rejects.toThrow()
  })

  it('ゲーム紹介画像の並び順配列(intro_photo_paths)がintroPhotoPathsとして引き継がれること', async () => {
    order2Mock.mockResolvedValue({
      data: [makeRow({ intro_photo_paths: ['req-1/0.jpg', 'req-1/1.jpg'] })],
      error: null,
    })

    const requests = await fetchGameRequests()

    expect(requests[0].introPhotoPaths).toEqual(['req-1/0.jpg', 'req-1/1.jpg'])
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録依頼の確認-13、specs/board-game-rules/admin/design.md#登録依頼を処理済みにする処理 / 削除する処理
describe('【管理画面】登録依頼を処理済みにする', () => {
  it('processed_atに現在時刻をセットするUPDATEが実行されtrueが返ること', async () => {
    const result = await markGameRequestProcessed('req-1')

    expect(result).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('board_game_rules_game_requests')
    const arg = updateMock.mock.calls[0][0] as { processed_at: string }
    expect(typeof arg.processed_at).toBe('string')
    expect(updateEqMock).toHaveBeenCalledWith('id', 'req-1')
  })

  it('UPDATEに失敗した場合、falseが返ること', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await markGameRequestProcessed('req-1')

    expect(result).toBe(false)
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録依頼の確認-14
describe('【管理画面】不要な登録依頼を削除する', () => {
  it('対象依頼のDELETEが実行されtrueが返ること', async () => {
    const result = await deleteGameRequest('req-1')

    expect(result).toBe(true)
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'req-1')
  })

  it('DELETEに失敗した場合、falseが返ること', async () => {
    deleteEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await deleteGameRequest('req-1')

    expect(result).toBe(false)
  })
})
