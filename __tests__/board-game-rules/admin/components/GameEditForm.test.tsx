import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, it, expect, vi } from 'vitest'
import GameEditForm from '../../../../app/board-game-rules/admin/components/GameEditForm'
import type { AdminGame } from '../../../../app/board-game-rules/admin/lib/fetchAdminGames'
import type { GameEditInput } from '../../../../app/board-game-rules/admin/lib/moderation'

// メイン画像表示に使う公開URL変換(gamePhotos.ts)は別spec(game-list T8)で検証済みのためモックする
vi.mock('../../../../app/board-game-rules/lib/gamePhotos', () => ({
  getGamePhotoUrl: vi.fn((path: string) => `https://example.com/game-photos/${path}`),
}))

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
    introPhotoPaths: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    deletedAt: null,
    photoPaths: [],
    reportCount: 0,
    ...overrides,
  }
}

type RenderOverrides = Partial<ComponentProps<typeof GameEditForm>>

// 各テストで毎回全propsを書かずに済むよう、既定値(モック)付きでレンダーするヘルパー
function renderForm(overrides: RenderOverrides = {}) {
  const props = {
    game: makeGame(),
    onSave: vi.fn(),
    onCancel: vi.fn(),
    onAddIntroPhotos: vi.fn().mockResolvedValue(true),
    onRemoveIntroPhoto: vi.fn().mockResolvedValue(true),
    onSetMainIntroPhoto: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
  render(<GameEditForm {...props} />)
  return props
}

// 仕様: specs/board-game-rules/admin/requirements.md#ゲームの編集・削除-6、specs/board-game-rules/admin/design.md#ゲームを編集して上書き保存する処理
describe('【管理画面】ゲーム編集フォーム - 分類情報・ルール本文を編集して上書き保存する', () => {
  it('既存のゲーム情報が初期値として表示されること', () => {
    renderForm()

    expect(screen.getByLabelText<HTMLInputElement>('ゲーム名').value).toBe('カタン')
    expect(screen.getByLabelText<HTMLTextAreaElement>('簡単版ルール').value).toBe('基本ルールの説明')
    expect(screen.getByLabelText<HTMLTextAreaElement>('概要').value).toBe('拡張なしの基本セットの説明')
  })

  it('保存ボタンを押すと、フォームの入力値でonSaveが呼ばれること', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    renderForm({ onSave })

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
    renderForm({ onSave })

    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(screen.getByText('保存しました。')).toBeTruthy())
  })

  it('保存に失敗すると「保存に失敗しました」と表示され、入力値が保持されること', async () => {
    const onSave = vi.fn().mockResolvedValue(false)
    renderForm({ onSave })

    fireEvent.change(screen.getByLabelText('ゲーム名'), { target: { value: 'カタン(改訂版)' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(screen.getByText('保存に失敗しました。')).toBeTruthy())
    expect(screen.getByLabelText<HTMLInputElement>('ゲーム名').value).toBe('カタン(改訂版)')
  })

  it('キャンセルボタンを押すとonCancelが呼ばれること', () => {
    const onCancel = vi.fn()
    renderForm({ onCancel })

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))

    expect(onCancel).toHaveBeenCalled()
  })

  it('章の本文を編集すると、その内容がonSaveに渡るrulesDetailedへ反映されること', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    renderForm({ onSave })

    fireEvent.change(screen.getByLabelText('勝利条件'), { target: { value: '最も得点が高いプレイヤーの勝ち' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    const arg = onSave.mock.calls[0][0] as GameEditInput
    expect(arg.rulesDetailed).toEqual(
      expect.arrayContaining([expect.objectContaining({ key: 'victory', body: '最も得点が高いプレイヤーの勝ち' })])
    )
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#ゲーム紹介画像の確認・自動補完-17、specs/board-game-rules/admin/design.md#ゲーム紹介画像を差し替え・削除する処理
describe('【管理画面】ゲーム編集フォーム - ゲーム紹介画像のプレビュー・追加・削除・メイン画像への並び替え', () => {
  it('登録済みのゲーム紹介画像がプレビュー表示され、先頭に「メイン」の印が表示されること', () => {
    renderForm({ game: makeGame({ introPhotoPaths: ['game-1/0.jpg', 'game-1/1.jpg'] }) })

    const image1 = screen.getByAltText<HTMLImageElement>('ゲーム紹介画像 1枚目')
    expect(image1.src).toBe('https://example.com/game-photos/game-1/0.jpg')
    expect(screen.getByAltText('ゲーム紹介画像 2枚目')).toBeTruthy()
    expect(screen.getByText('メイン')).toBeTruthy()
  })

  it('新しい画像を選択すると、onAddIntroPhotosがゲームID・既存パス・選択ファイルで呼ばれること', async () => {
    const onAddIntroPhotos = vi.fn().mockResolvedValue(true)
    const game = makeGame({ introPhotoPaths: ['game-1/0.jpg'] })
    renderForm({ game, onAddIntroPhotos })

    const file = new File(['dummy'], 'new.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('ゲーム紹介画像を追加'), { target: { files: [file] } })

    await waitFor(() => expect(onAddIntroPhotos).toHaveBeenCalledWith('game-1', ['game-1/0.jpg'], [file]))
  })

  it('2枚目以降の「メイン画像にする」を押すと、onSetMainIntroPhotoがゲームID・既存パス・対象パスで呼ばれること', async () => {
    const onSetMainIntroPhoto = vi.fn().mockResolvedValue(true)
    const game = makeGame({ introPhotoPaths: ['game-1/0.jpg', 'game-1/1.jpg'] })
    renderForm({ game, onSetMainIntroPhoto })

    fireEvent.click(screen.getByLabelText('ゲーム紹介画像 2枚目をメイン画像にする'))

    await waitFor(() =>
      expect(onSetMainIntroPhoto).toHaveBeenCalledWith('game-1', ['game-1/0.jpg', 'game-1/1.jpg'], 'game-1/1.jpg')
    )
  })

  it('先頭の画像には「メイン画像にする」ボタンが表示されないこと(既にメインのため)', () => {
    renderForm({ game: makeGame({ introPhotoPaths: ['game-1/0.jpg', 'game-1/1.jpg'] }) })

    expect(screen.queryByLabelText('ゲーム紹介画像 1枚目をメイン画像にする')).toBeNull()
  })

  it('削除ボタンを押すと、onRemoveIntroPhotoがゲームID・既存パス・対象パスで呼ばれること', async () => {
    const onRemoveIntroPhoto = vi.fn().mockResolvedValue(true)
    const game = makeGame({ introPhotoPaths: ['game-1/0.jpg', 'game-1/1.jpg'] })
    renderForm({ game, onRemoveIntroPhoto })

    fireEvent.click(screen.getByLabelText('ゲーム紹介画像 1枚目を削除'))

    await waitFor(() =>
      expect(onRemoveIntroPhoto).toHaveBeenCalledWith('game-1', ['game-1/0.jpg', 'game-1/1.jpg'], 'game-1/0.jpg')
    )
  })
})
