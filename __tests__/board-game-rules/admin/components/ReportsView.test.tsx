import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ReportsView from '../../../../app/board-game-rules/admin/components/ReportsView'
import type { Report } from '../../../../app/board-game-rules/admin/lib/fetchReports'

const gameNames = { 'game-1': 'カタン' }

// 仕様: specs/board-game-rules/admin/requirements.md#通報の確認-6、specs/board-game-rules/admin/requirements.md#通報の確認-7
describe('【管理画面】通報一覧 - 対象ゲーム・通報日時・理由テキストを表示し、対象ゲームの詳細画面へ導く', () => {
  it('対象ゲーム名・通報理由が表示されること', () => {
    const report: Report = { id: 'r1', gameId: 'game-1', reason: '内容が古い', createdAt: '2026-08-01T00:00:00.000Z' }
    render(<ReportsView reports={[report]} gameNames={gameNames} />)

    expect(screen.getByText('カタン')).toBeTruthy()
    expect(screen.getByText('内容が古い')).toBeTruthy()
  })

  it('理由が未入力(null)の通報は「理由の記載なし」と表示されること', () => {
    const report: Report = { id: 'r1', gameId: 'game-1', reason: null, createdAt: '2026-08-01T00:00:00.000Z' }
    render(<ReportsView reports={[report]} gameNames={gameNames} />)

    expect(screen.getByText('理由の記載なし')).toBeTruthy()
  })

  it('対象ゲーム名が見つからない(削除済み等)場合でも、フォールバック表示されること', () => {
    const report: Report = { id: 'r1', gameId: 'missing-game', reason: null, createdAt: '2026-08-01T00:00:00.000Z' }
    render(<ReportsView reports={[report]} gameNames={gameNames} />)

    expect(screen.getByText(/削除された、または取得できないゲーム/)).toBeTruthy()
  })

  it('各通報に、対象ゲームの詳細画面(game-detail)へのリンクが出ること', () => {
    const report: Report = { id: 'r1', gameId: 'game-1', reason: null, createdAt: '2026-08-01T00:00:00.000Z' }
    render(<ReportsView reports={[report]} gameNames={gameNames} />)

    const link = screen.getByRole('link', { name: '対象ゲームの詳細を開く' })
    expect(link.getAttribute('href')).toBe('/board-game-rules/detail?id=game-1')
  })

  it('通報が0件のとき、その旨が表示されること', () => {
    render(<ReportsView reports={[]} gameNames={{}} />)

    expect(screen.getByText('通報はありません。')).toBeTruthy()
  })
})
