import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ReportsView from '../../../../app/board-game-rules/admin/components/ReportsView'
import type { Report } from '../../../../app/board-game-rules/admin/lib/fetchReports'
import type { AdminGame } from '../../../../app/board-game-rules/admin/lib/fetchAdminGames'

function makeGame(overrides: Partial<AdminGame> = {}): AdminGame {
  return {
    id: 'game-1',
    name: 'カタン',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: [],
    minAge: null,
    difficulty: null,
    publisher: null,
    author: null,
    hasJapaneseRules: null,
    awards: null,
    releaseYear: null,
    rulesSimple: '',
    rulesDetailed: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    deletedAt: null,
    photoPaths: [],
    reportCount: 1,
    ...overrides,
  }
}

// 仕様: specs/board-game-rules/admin/requirements.md#通報の確認-8、specs/board-game-rules/admin/requirements.md#通報の確認-9
describe('【管理画面】通報一覧 - 対象ゲーム・通報日時・理由テキストを表示し、対象ゲームの編集へ導く', () => {
  it('対象ゲーム名・通報理由が表示されること', () => {
    const report: Report = { id: 'r1', gameId: 'game-1', reason: '内容が古い', createdAt: '2026-08-01T00:00:00.000Z' }
    render(<ReportsView reports={[report]} games={[makeGame()]} onSelectGame={vi.fn()} />)

    expect(screen.getByText('カタン')).toBeTruthy()
    expect(screen.getByText('内容が古い')).toBeTruthy()
  })

  it('理由が未入力(null)の通報は「理由の記載なし」と表示されること', () => {
    const report: Report = { id: 'r1', gameId: 'game-1', reason: null, createdAt: '2026-08-01T00:00:00.000Z' }
    render(<ReportsView reports={[report]} games={[makeGame()]} onSelectGame={vi.fn()} />)

    expect(screen.getByText('理由の記載なし')).toBeTruthy()
  })

  it('対象ゲームが一覧に見つからない場合でも、ゲームIDでフォールバック表示されること', () => {
    const report: Report = { id: 'r1', gameId: 'missing-game', reason: null, createdAt: '2026-08-01T00:00:00.000Z' }
    render(<ReportsView reports={[report]} games={[makeGame()]} onSelectGame={vi.fn()} />)

    expect(screen.getByText('missing-game')).toBeTruthy()
  })

  it('「対象ゲームを編集する」を押すと、対象ゲームIDでonSelectGameが呼ばれること', () => {
    const onSelectGame = vi.fn()
    const report: Report = { id: 'r1', gameId: 'game-1', reason: null, createdAt: '2026-08-01T00:00:00.000Z' }
    render(<ReportsView reports={[report]} games={[makeGame()]} onSelectGame={onSelectGame} />)

    fireEvent.click(screen.getByRole('button', { name: '対象ゲームを編集する' }))

    expect(onSelectGame).toHaveBeenCalledWith('game-1')
  })

  it('通報が0件のとき、その旨が表示されること', () => {
    render(<ReportsView reports={[]} games={[]} onSelectGame={vi.fn()} />)

    expect(screen.getByText('通報はありません。')).toBeTruthy()
  })
})
