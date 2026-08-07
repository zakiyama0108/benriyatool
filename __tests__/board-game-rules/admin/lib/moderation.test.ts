import { describe, it, expect, vi, beforeEach } from 'vitest'

const { updateMock, updateEqMock, deleteMock, deleteEqMock, fromMock } = vi.hoisted(() => {
  const updateEqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))
  const deleteEqMock = vi.fn()
  const deleteMock = vi.fn(() => ({ eq: deleteEqMock }))
  const fromMock = vi.fn(() => ({ update: updateMock, delete: deleteMock }))
  return { updateMock, updateEqMock, deleteMock, deleteEqMock, fromMock }
})
vi.mock('../../../../app/lib/supabaseClient', () => ({ supabase: { from: fromMock } }))

import { editGame, deleteGame, deleteComment, type GameEditInput } from '../../../../app/board-game-rules/admin/lib/moderation'

function validInput(overrides: Partial<GameEditInput> = {}): GameEditInput {
  return {
    id: 'game-1',
    name: 'カタン',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: ['対戦', '戦略'],
    rulesSimple: '基本ルールの説明',
    rulesDetailed: [{ key: 'overview', body: '概要' }],
    ...overrides,
  }
}

beforeEach(() => {
  fromMock.mockClear()
  updateMock.mockClear()
  updateEqMock.mockReset().mockResolvedValue({ data: null, error: null })
  deleteMock.mockClear()
  deleteEqMock.mockReset().mockResolvedValue({ data: null, error: null })
})

// 仕様: specs/board-game-rules/admin/requirements.md#ゲームの編集・削除-6、specs/board-game-rules/admin/design.md「ゲームを編集して上書き保存する処理」
describe('【管理画面】ゲームを編集して上書き保存する - 登録時と同じ検証を通す', () => {
  it('妥当な入力ではUPDATEが実行されtrueが返ること', async () => {
    const result = await editGame(validInput())

    expect(result).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('board_game_rules_games')
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'カタン', min_players: 3, max_players: 4, genres: ['対戦', '戦略'] })
    )
    expect(updateEqMock).toHaveBeenCalledWith('id', 'game-1')
  })

  it('ゲーム名が空文字の場合、UPDATEされずfalseが返ること', async () => {
    const result = await editGame(validInput({ name: '' }))

    expect(result).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('対応人数が下限>上限の場合、UPDATEされずfalseが返ること', async () => {
    const result = await editGame(validInput({ minPlayers: 5, maxPlayers: 2 }))

    expect(result).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('プレイ時間が下限>上限の場合、UPDATEされずfalseが返ること', async () => {
    const result = await editGame(validInput({ minMinutes: 90, maxMinutes: 30 }))

    expect(result).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('簡単版ルールが4000字を超える場合、UPDATEされずfalseが返ること', async () => {
    const result = await editGame(validInput({ rulesSimple: 'あ'.repeat(4001) }))

    expect(result).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('詳しい版ルールの合計文字数が40000字を超える場合、UPDATEされずfalseが返ること', async () => {
    const result = await editGame(
      validInput({ rulesDetailed: [{ key: 'overview', body: 'あ'.repeat(40001) }] })
    )

    expect(result).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('UPDATEがエラーを返した場合、falseが返ること', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await editGame(validInput())

    expect(result).toBe(false)
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#ゲームの編集・削除-7、specs/board-game-rules/admin/design.md「ゲームを削除する処理」
describe('【管理画面】ゲームを削除する - deleted_atをセットする論理削除', () => {
  it('deleted_atに現在時刻をセットするUPDATEが実行されtrueが返ること', async () => {
    const result = await deleteGame('game-1')

    expect(result).toBe(true)
    const arg = updateMock.mock.calls[0][0] as { deleted_at: string }
    expect(typeof arg.deleted_at).toBe('string')
    expect(updateEqMock).toHaveBeenCalledWith('id', 'game-1')
  })

  it('UPDATEに失敗した場合、falseが返ること', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await deleteGame('game-1')

    expect(result).toBe(false)
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#コメントの削除-11、specs/board-game-rules/admin/design.md「コメントを削除する処理」
describe('【管理画面】不適切なコメントを削除する', () => {
  it('対象コメントのDELETEが実行されtrueが返ること', async () => {
    const result = await deleteComment('comment-1')

    expect(result).toBe(true)
    expect(fromMock).toHaveBeenCalledWith('board_game_rules_comments')
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'comment-1')
  })

  it('DELETEに失敗した場合、falseが返ること', async () => {
    deleteEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await deleteComment('comment-1')

    expect(result).toBe(false)
  })
})
