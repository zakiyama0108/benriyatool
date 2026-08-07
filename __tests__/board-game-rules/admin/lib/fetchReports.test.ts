import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fromMock, selectMock, orderMock } = vi.hoisted(() => {
  const orderMock = vi.fn()
  const selectMock = vi.fn(() => ({ order: orderMock }))
  const fromMock = vi.fn(() => ({ select: selectMock }))
  return { fromMock, selectMock, orderMock }
})
vi.mock('../../../../app/lib/supabaseClient', () => ({ supabase: { from: fromMock } }))

import { fetchReports } from '../../../../app/board-game-rules/admin/lib/fetchReports'

beforeEach(() => {
  fromMock.mockClear()
  selectMock.mockClear()
  orderMock.mockReset().mockResolvedValue({ data: [], error: null })
})

// 仕様: specs/board-game-rules/admin/requirements.md#通報の確認-8、specs/board-game-rules/admin/design.md#通報を確認する処理
describe('【管理画面】通報一覧を取得する - 対象ゲーム・通報日時・理由テキストを新しい順に取得する', () => {
  it('board_game_rules_reportsを新しい順に取得すること', async () => {
    await fetchReports()

    expect(fromMock).toHaveBeenCalledWith('board_game_rules_reports')
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('取得した行(対象ゲームID・理由・日時)がそのまま返ること', async () => {
    orderMock.mockResolvedValue({
      data: [{ id: 'r1', game_id: 'g1', reason: '内容が古い', created_at: '2026-08-01T00:00:00.000Z' }],
      error: null,
    })

    const reports = await fetchReports()

    expect(reports).toEqual([
      { id: 'r1', gameId: 'g1', reason: '内容が古い', createdAt: '2026-08-01T00:00:00.000Z' },
    ])
  })

  it('reasonが未入力(null)の通報も取得できること', async () => {
    orderMock.mockResolvedValue({
      data: [{ id: 'r1', game_id: 'g1', reason: null, created_at: '2026-08-01T00:00:00.000Z' }],
      error: null,
    })

    const reports = await fetchReports()

    expect(reports[0].reason).toBeNull()
  })

  it('取得に失敗した場合、例外を投げて呼び出し元(画面)でエラー表示できるようにすること', async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    await expect(fetchReports()).rejects.toThrow()
  })
})
