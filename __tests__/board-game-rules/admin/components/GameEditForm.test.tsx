import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GameEditForm from '../../../../app/board-game-rules/admin/components/GameEditForm'
import type { AdminGame } from '../../../../app/board-game-rules/admin/lib/fetchAdminGames'
import type { GameEditInput } from '../../../../app/board-game-rules/admin/lib/moderation'

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
    rulesSimple: '基本ルールの説明',
    rulesDetailed: [{ key: 'overview', body: '拡張なしの基本セットの説明' }],
    createdAt: '2026-08-01T00:00:00.000Z',
    deletedAt: null,
    photoPaths: [],
    reportCount: 0,
    ...overrides,
  }
}

// 仕様: specs/board-game-rules/admin/requirements.md#ゲームの編集・削除-6、specs/board-game-rules/admin/design.md「ゲームを編集して上書き保存する処理」
describe('【管理画面】ゲーム編集フォーム - 分類情報・ルール本文を編集して上書き保存する', () => {
  it('既存のゲーム情報が初期値として表示されること', () => {
    render(<GameEditForm game={makeGame()} onSave={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByLabelText<HTMLInputElement>('ゲーム名').value).toBe('カタン')
    expect(screen.getByLabelText<HTMLTextAreaElement>('簡単版ルール').value).toBe('基本ルールの説明')
    expect(screen.getByLabelText<HTMLTextAreaElement>('概要').value).toBe('拡張なしの基本セットの説明')
  })

  it('保存ボタンを押すと、フォームの入力値でonSaveが呼ばれること', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<GameEditForm game={makeGame()} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('ゲーム名'), { target: { value: 'カタン(改訂版)' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const arg = onSave.mock.calls[0][0] as GameEditInput
    expect(arg.id).toBe('game-1')
    expect(arg.name).toBe('カタン(改訂版)')
    expect(arg.rulesDetailed).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'overview', body: '拡張なしの基本セットの説明' })])
    )
  })

  it('保存に成功すると「保存しました」と表示されること', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<GameEditForm game={makeGame()} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(screen.getByText('保存しました。')).toBeTruthy())
  })

  it('保存に失敗すると「保存に失敗しました」と表示され、入力値が保持されること', async () => {
    const onSave = vi.fn().mockResolvedValue(false)
    render(<GameEditForm game={makeGame()} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('ゲーム名'), { target: { value: 'カタン(改訂版)' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(screen.getByText('保存に失敗しました。')).toBeTruthy())
    expect(screen.getByLabelText<HTMLInputElement>('ゲーム名').value).toBe('カタン(改訂版)')
  })

  it('キャンセルボタンを押すとonCancelが呼ばれること', () => {
    const onCancel = vi.fn()
    render(<GameEditForm game={makeGame()} onSave={vi.fn()} onCancel={onCancel} />)

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(onCancel).toHaveBeenCalled()
  })

  it('章の本文を編集すると、その内容がonSaveに渡るrulesDetailedへ反映されること', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<GameEditForm game={makeGame()} onSave={onSave} onCancel={vi.fn()} />)

    fireEvent.change(screen.getByLabelText('勝利条件'), { target: { value: '最も得点が高いプレイヤーの勝ち' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const arg = onSave.mock.calls[0][0] as GameEditInput
    expect(arg.rulesDetailed).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'victory', body: '最も得点が高いプレイヤーの勝ち' })])
    )
  })
})
