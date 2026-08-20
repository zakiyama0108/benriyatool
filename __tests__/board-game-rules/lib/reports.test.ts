import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('../../../app/lib/supabaseClient', () => ({ supabase: { from: fromMock } }))

import { createReport } from '../../../app/board-game-rules/lib/reports'

// board_game_rules_reports へのINSERT(通報送信)をモックする。
// insertに実際に渡された値を検証できるよう捕捉する
function setupFrom(insertResult: { data: unknown; error: unknown } = { data: null, error: null }) {
  const insertMock = vi.fn().mockResolvedValue(insertResult)
  fromMock.mockImplementation((table: string) => {
    if (table !== 'board_game_rules_reports') throw new Error(`unexpected table: ${table}`)
    return { insert: insertMock }
  })
  return { insertMock }
}

beforeEach(() => {
  fromMock.mockReset()
})

// 仕様: specs/board-game-rules/report/requirements.md#通報の送信-3、specs/board-game-rules/report/requirements.md#保存内容-2
describe('通報の送信 - 対象ゲームと任意の理由テキストを匿名で保存する', () => {
  it('理由を記入して送信すると、対象game_idと理由テキストでINSERTされ、trueが返ること', async () => {
    const { insertMock } = setupFrom()

    const result = await createReport('game-1', 'ルール解説に誤りがあります')

    expect(insertMock).toHaveBeenCalledWith({ game_id: 'game-1', reason: 'ルール解説に誤りがあります' })
    expect(result).toBe(true)
  })

  it('理由を記入せず(空)に送信した場合も、理由をNULLとしてINSERTでき、trueが返ること', async () => {
    const { insertMock } = setupFrom()

    const result = await createReport('game-1', '')

    expect(insertMock).toHaveBeenCalledWith({ game_id: 'game-1', reason: null })
    expect(result).toBe(true)
  })

  it('理由が空白のみの場合も、理由はNULLとして保存されること', async () => {
    const { insertMock } = setupFrom()

    await createReport('game-1', '   ')

    expect(insertMock).toHaveBeenCalledWith({ game_id: 'game-1', reason: null })
  })

  it('理由の前後の空白は取り除いて保存されること', async () => {
    const { insertMock } = setupFrom()

    await createReport('game-1', '  誤りがあります  ')

    expect(insertMock).toHaveBeenCalledWith({ game_id: 'game-1', reason: '誤りがあります' })
  })
})

// 仕様: specs/board-game-rules/report/requirements.md#ボット対策・濫用防止-1
describe('通報の送信 - 理由テキストの文字数上限(1000文字)を超える送信は弾く', () => {
  it('理由が上限(1000文字)を超える場合は送信せず、INSERTを呼ばずにfalseを返すこと', async () => {
    const { insertMock } = setupFrom()

    const result = await createReport('game-1', 'あ'.repeat(1001))

    expect(insertMock).not.toHaveBeenCalled()
    expect(result).toBe(false)
  })
})

// 仕様: specs/board-game-rules/report/requirements.md#通報の送信-4
describe('通報の送信 - 送信に失敗した場合は失敗を呼び出し元へ伝える(再送できるように)', () => {
  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    setupFrom({ data: null, error: { message: 'permission denied' } })

    await expect(createReport('game-1', '理由')).resolves.toBe(false)
  })

  it('送信処理が例外を投げた場合も、falseで正常終了すること', async () => {
    fromMock.mockImplementation(() => ({
      insert: vi.fn(() => {
        throw new Error('network error')
      }),
    }))

    await expect(createReport('game-1', '理由')).resolves.toBe(false)
  })
})
