import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminControls from '../../../app/board-game-rules/components/AdminControls'
import type { Game } from '../../../app/board-game-rules/lib/games'
import { editGame, deleteGame } from '../../../app/board-game-rules/lib/gameModeration'
import { fetchOriginalPhotos } from '../../../app/board-game-rules/lib/originalPhotos'
import { removeIntroPhoto, setMainIntroPhoto } from '../../../app/board-game-rules/lib/introPhotos'

vi.mock('../../../app/board-game-rules/lib/gameModeration', () => ({
  editGame: vi.fn(),
  deleteGame: vi.fn(),
}))
vi.mock('../../../app/board-game-rules/lib/originalPhotos', () => ({ fetchOriginalPhotos: vi.fn() }))
vi.mock('../../../app/board-game-rules/lib/introPhotos', () => ({
  addIntroPhotos: vi.fn(),
  removeIntroPhoto: vi.fn(),
  setMainIntroPhoto: vi.fn(),
}))
vi.mock('../../../app/board-game-rules/lib/gamePhotos', () => ({
  getGamePhotoUrl: (path: string) => `https://cdn.example/${path}`,
}))

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'game-1',
    name: 'カタン',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: ['戦略'],
    minAge: null,
    difficulty: null,
    publisher: null,
    author: null,
    hasJapaneseRules: null,
    awards: null,
    releaseYear: null,
    rulesSimple: '要約',
    rulesDetailed: [],
    introPhotoPaths: ['game-1/0.jpg', 'game-1/1.jpg'],
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(editGame).mockResolvedValue(true)
  vi.mocked(deleteGame).mockResolvedValue(true)
  vi.mocked(fetchOriginalPhotos).mockResolvedValue([])
  vi.mocked(removeIntroPhoto).mockResolvedValue(true)
  vi.mocked(setMainIntroPhoto).mockResolvedValue(true)
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#運営者向けの操作(管理者ログイン時)-10
describe('管理者メニュー - ゲームを編集して上書き保存する', () => {
  it('編集フォームを開いてゲーム名を書き換え保存すると、editGameが呼ばれ成功したら再取得が通知されること', async () => {
    const onChanged = vi.fn()
    render(<AdminControls game={makeGame()} onChanged={onChanged} onDeleted={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    fireEvent.change(screen.getByLabelText('ゲーム名'), { target: { value: 'カタン(改訂)' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => expect(editGame).toHaveBeenCalledWith(expect.objectContaining({ id: 'game-1', name: 'カタン(改訂)' })))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('対応人数・プレイ時間が未登録(null)のゲームは、編集フォームの入力欄が空欄で始まり、未入力のままでも保存できること(仕様: admin/requirements.md#登録実行のローカル処理起動-13)', async () => {
    const onChanged = vi.fn()
    render(
      <AdminControls
        game={makeGame({ minPlayers: null, maxPlayers: null, minMinutes: null, maxMinutes: null })}
        onChanged={onChanged}
        onDeleted={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '編集' }))

    expect(screen.getByLabelText<HTMLInputElement>('対応人数(下限)').value).toBe('')
    expect(screen.getByLabelText<HTMLInputElement>('対応人数(上限)').value).toBe('')

    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() =>
      expect(editGame).toHaveBeenCalledWith(
        expect.objectContaining({ minPlayers: undefined, maxPlayers: undefined, minMinutes: undefined, maxMinutes: undefined })
      )
    )
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#運営者向けの操作(管理者ログイン時)-11
describe('管理者メニュー - ゲームを物理削除する(誤操作防止の確認ステップを挟む)', () => {
  it('削除ボタンを押しただけでは削除されず、確認を確定して初めてdeleteGameが呼ばれること', async () => {
    const onDeleted = vi.fn()
    render(<AdminControls game={makeGame()} onChanged={vi.fn()} onDeleted={onDeleted} />)

    fireEvent.click(screen.getByRole('button', { name: 'ゲームを削除' }))
    expect(deleteGame).not.toHaveBeenCalled() // 確認前は削除しない

    fireEvent.click(screen.getByRole('button', { name: '削除を確定' }))

    expect(deleteGame).toHaveBeenCalledWith('game-1')
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#運営者向けの操作(管理者ログイン時)-13
describe('管理者メニュー - 元写真を照合閲覧する', () => {
  it('元写真の照合ボタンを押すとfetchOriginalPhotosが呼ばれ、取得した元写真が表示されること', async () => {
    vi.mocked(fetchOriginalPhotos).mockResolvedValue([{ path: 'uuid/0.jpg', url: 'https://signed/0' }])
    render(<AdminControls game={makeGame()} onChanged={vi.fn()} onDeleted={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /元写真/ }))

    expect(fetchOriginalPhotos).toHaveBeenCalledWith('game-1')
    await waitFor(() => {
      const img = screen.getAllByRole('img').find((el) => el.getAttribute('src') === 'https://signed/0')
      expect(img).toBeTruthy()
    })
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#運営者向けの操作(管理者ログイン時)-12
describe('管理者メニュー - ゲーム紹介画像を差し替え・削除・並び替えする', () => {
  it('紹介画像の削除操作でremoveIntroPhotoが呼ばれ、成功したら再取得が通知されること', async () => {
    const onChanged = vi.fn()
    render(<AdminControls game={makeGame()} onChanged={onChanged} onDeleted={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /1枚目を削除/ }))

    expect(removeIntroPhoto).toHaveBeenCalledWith('game-1', ['game-1/0.jpg', 'game-1/1.jpg'], 'game-1/0.jpg')
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('2枚目をメイン画像にする操作でsetMainIntroPhotoが呼ばれること', () => {
    render(<AdminControls game={makeGame()} onChanged={vi.fn()} onDeleted={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /2枚目をメイン画像にする/ }))

    expect(setMainIntroPhoto).toHaveBeenCalledWith('game-1', ['game-1/0.jpg', 'game-1/1.jpg'], 'game-1/1.jpg')
  })
})
