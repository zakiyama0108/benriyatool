import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GameModerationTable from '../../../../app/board-game-rules/admin/components/GameModerationTable'
import type { AdminGame } from '../../../../app/board-game-rules/admin/lib/fetchAdminGames'

function makeGame(overrides: Partial<AdminGame> = {}): AdminGame {
  return {
    id: 'game-1',
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
    rulesSimple: '基本ルール',
    rulesDetailed: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    deletedAt: null,
    photoPaths: ['game-1/0.jpg'],
    reportCount: 0,
    ...overrides,
  }
}

// 仕様: specs/board-game-rules/admin/requirements.md#ゲームの編集・削除-5、specs/board-game-rules/admin/design.md「ゲーム一覧を取得する処理」
describe('【管理画面】ゲーム一覧表 - 通報件数・削除済みの区別、編集・削除・写真照合の導線', () => {
  it('ゲーム名・通報件数が表示されること', () => {
    render(
      <GameModerationTable
        games={[makeGame({ reportCount: 3 })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onViewPhotos={vi.fn()}
      />
    )
    expect(screen.getByText('カタン')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('削除済みのゲームには「削除済み」と表示されること', () => {
    render(
      <GameModerationTable
        games={[makeGame({ deletedAt: '2026-08-05T00:00:00.000Z' })]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onViewPhotos={vi.fn()}
      />
    )
    expect(screen.getByText('削除済み')).toBeTruthy()
  })

  it('編集ボタンを押すと、対象ゲームのIDでonEditが呼ばれること', () => {
    const onEdit = vi.fn()
    render(<GameModerationTable games={[makeGame()]} onEdit={onEdit} onDelete={vi.fn()} onViewPhotos={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    expect(onEdit).toHaveBeenCalledWith('game-1')
  })

  it('削除ボタンを押すと確認表示が出て、確定を押すまでonDeleteは呼ばれないこと', () => {
    const onDelete = vi.fn()
    render(<GameModerationTable games={[makeGame()]} onEdit={vi.fn()} onDelete={onDelete} onViewPhotos={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.getByText('本当に削除しますか?')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '削除を確定' }))
    expect(onDelete).toHaveBeenCalledWith('game-1')
  })

  it('削除確認でキャンセルを押すと、確認表示が消えonDeleteが呼ばれないこと', () => {
    const onDelete = vi.fn()
    render(<GameModerationTable games={[makeGame()]} onEdit={vi.fn()} onDelete={onDelete} onViewPhotos={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onDelete).not.toHaveBeenCalled()
    expect(screen.queryByText('本当に削除しますか?')).toBeNull()
  })

  it('「元写真を確認」ボタンを押すとonViewPhotosが呼ばれ、取得できた写真が表示されること', async () => {
    const onViewPhotos = vi.fn().mockResolvedValue([{ path: 'game-1/0.jpg', url: 'https://example.com/a.jpg' }])
    render(
      <GameModerationTable games={[makeGame()]} onEdit={vi.fn()} onDelete={vi.fn()} onViewPhotos={onViewPhotos} />
    )

    fireEvent.click(screen.getByRole('button', { name: '元写真を確認' }))

    expect(onViewPhotos).toHaveBeenCalledWith(['game-1/0.jpg'])
    await waitFor(() => expect(screen.getByAltText('投稿された元写真')).toBeTruthy())
  })
})
