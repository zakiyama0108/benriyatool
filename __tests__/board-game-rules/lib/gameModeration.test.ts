import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('../../../app/lib/supabaseClient', () => ({ supabase: { from: fromMock } }))

import { editGame, deleteGame, type GameEditInput } from '../../../app/board-game-rules/lib/gameModeration'

function validInput(overrides: Partial<GameEditInput> = {}): GameEditInput {
  return {
    id: 'game-1',
    name: 'カタン',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: ['戦略'],
    rulesSimple: '要約',
    rulesDetailed: [{ key: 'overview', body: '概要本文' }],
    ...overrides,
  }
}

function setupUpdate(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const eqMock = vi.fn().mockResolvedValue(result)
  const updateMock = vi.fn(() => ({ eq: eqMock }))
  fromMock.mockImplementation((table: string) => {
    if (table !== 'board_game_rules_games') throw new Error(`unexpected table: ${table}`)
    return { update: updateMock }
  })
  return { updateMock, eqMock }
}

function setupDelete(result: { data: unknown; error: unknown } = { data: null, error: null }) {
  const eqMock = vi.fn().mockResolvedValue(result)
  const deleteMock = vi.fn(() => ({ eq: eqMock }))
  const updateMock = vi.fn(() => ({ eq: vi.fn() }))
  fromMock.mockImplementation((table: string) => {
    if (table !== 'board_game_rules_games') throw new Error(`unexpected table: ${table}`)
    return { delete: deleteMock, update: updateMock }
  })
  return { deleteMock, updateMock, eqMock }
}

beforeEach(() => {
  fromMock.mockReset()
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#運営者向けの操作-10
describe('運営者によるゲーム編集 - 登録時と同じ検証を通して分類情報・ルール本文を上書き保存する', () => {
  it('検証を満たす入力なら、対象idの行がUPDATEされてtrueが返ること', async () => {
    const { updateMock, eqMock } = setupUpdate()

    const result = await editGame(validInput())

    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({ name: 'カタン', min_players: 3, rules_simple: '要約' }))
    expect(eqMock).toHaveBeenCalledWith('id', 'game-1')
    expect(result).toBe(true)
  })

  it('ゲーム名が空のときはUPDATEを呼ばずfalseを返すこと', async () => {
    const { updateMock } = setupUpdate()

    const result = await editGame(validInput({ name: '  ' }))

    expect(updateMock).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it('対応人数の下限が上限を超えるときはUPDATEを呼ばずfalseを返すこと', async () => {
    const { updateMock } = setupUpdate()

    const result = await editGame(validInput({ minPlayers: 5, maxPlayers: 4 }))

    expect(updateMock).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    setupUpdate({ data: null, error: { message: 'permission denied' } })

    await expect(editGame(validInput())).resolves.toBe(false)
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#運営者向けの操作-11、specs/board-game-rules/game-detail/requirements.md#運営者による削除の方針-4
describe('運営者によるゲーム物理削除 - 論理削除ではなく行そのものをDELETEする', () => {
  it('対象idの行がDELETE(UPDATEではない)で削除され、trueが返ること', async () => {
    const { deleteMock, updateMock, eqMock } = setupDelete()

    const result = await deleteGame('game-1')

    expect(deleteMock).toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled() // deleted_atを立てる論理削除ではないことを明示
    expect(eqMock).toHaveBeenCalledWith('id', 'game-1')
    expect(result).toBe(true)
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    setupDelete({ data: null, error: { message: 'permission denied' } })

    await expect(deleteGame('game-1')).resolves.toBe(false)
  })

  it('削除処理が例外を投げた場合も、falseで正常終了すること', async () => {
    fromMock.mockImplementation(() => ({
      delete: () => ({
        eq: vi.fn(() => {
          throw new Error('network error')
        }),
      }),
    }))

    await expect(deleteGame('game-1')).resolves.toBe(false)
  })
})
