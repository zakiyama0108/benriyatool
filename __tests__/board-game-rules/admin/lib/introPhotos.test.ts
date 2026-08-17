import { describe, it, expect, vi, beforeEach } from 'vitest'

const { uploadMock, storageFromMock, updateEqMock, updateMock, fromMock } = vi.hoisted(() => {
  const uploadMock = vi.fn()
  const storageFromMock = vi.fn(() => ({ upload: uploadMock }))
  const updateEqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))
  const fromMock = vi.fn(() => ({ update: updateMock }))
  return { uploadMock, storageFromMock, updateEqMock, updateMock, fromMock }
})
vi.mock('../../../../app/lib/supabaseClient', () => ({
  supabase: { from: fromMock, storage: { from: storageFromMock } },
}))

import { addIntroPhotos, removeIntroPhoto, setMainIntroPhoto } from '../../../../app/board-game-rules/admin/lib/introPhotos'

function makePhoto(name = 'photo.jpg'): File {
  return new File(['dummy'], name, { type: 'image/jpeg' })
}

beforeEach(() => {
  fromMock.mockClear()
  storageFromMock.mockClear()
  updateMock.mockClear()
  uploadMock.mockReset().mockResolvedValue({ data: { path: 'game-1/1.jpg' }, error: null })
  updateEqMock.mockReset().mockResolvedValue({ data: null, error: null })
})

// 仕様: specs/board-game-rules/admin/requirements.md#ゲーム紹介画像の確認・自動補完-17、specs/board-game-rules/admin/design.md#ゲーム紹介画像を差し替え・削除する処理
describe('【管理画面】ゲーム紹介画像の追加アップロード - 公開Storageへ保存しintro_photo_pathsの末尾に追加する', () => {
  it('新しい画像を公開Storage(board-game-rules-game-photos)へゲームID配下でアップロードし、既存パスの末尾に追加してUPDATEすること', async () => {
    const result = await addIntroPhotos('game-1', ['game-1/0.jpg'], [makePhoto()])

    expect(result).toBe(true)
    expect(storageFromMock).toHaveBeenCalledWith('board-game-rules-game-photos')
    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('board_game_rules_games')
    expect(updateMock).toHaveBeenCalledWith({ intro_photo_paths: ['game-1/0.jpg', 'game-1/1.jpg'] })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'game-1')
  })

  it('既存分と合わせて上限20枚に達している場合、追加分は切り捨てられること', async () => {
    const existing = Array.from({ length: 19 }, (_, i) => `game-1/${i}.jpg`)
    const files = [makePhoto('a.jpg'), makePhoto('b.jpg')]

    const result = await addIntroPhotos('game-1', existing, files)

    expect(result).toBe(true)
    expect(uploadMock).toHaveBeenCalledTimes(1)
    const arg = updateMock.mock.calls[0][0] as { intro_photo_paths: string[] }
    expect(arg.intro_photo_paths).toHaveLength(20)
  })

  it('既に上限20枚に達している場合、アップロードされずfalseで即終了すること', async () => {
    const existing = Array.from({ length: 20 }, (_, i) => `game-1/${i}.jpg`)

    const result = await addIntroPhotos('game-1', existing, [makePhoto()])

    expect(result).toBe(false)
    expect(uploadMock).not.toHaveBeenCalled()
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('画像のアップロードに失敗した場合、UPDATEは行われずfalseが返ること', async () => {
    uploadMock.mockResolvedValue({ data: null, error: { message: 'storage error' } })

    const result = await addIntroPhotos('game-1', [], [makePhoto()])

    expect(result).toBe(false)
    expect(updateMock).not.toHaveBeenCalled()
  })

  it('UPDATEに失敗した場合、falseが返ること', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await addIntroPhotos('game-1', [], [makePhoto()])

    expect(result).toBe(false)
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#ゲーム紹介画像の確認・自動補完-17、specs/board-game-rules/admin/design.md#ゲーム紹介画像を差し替え・削除する処理
describe('【管理画面】ゲーム紹介画像の削除 - 配列から取り除きUPDATEする(Storageオブジェクト自体は削除しない)', () => {
  it('指定パスを配列から取り除いた内容でUPDATEされ、Storageの削除は呼ばれないこと', async () => {
    const result = await removeIntroPhoto('game-1', ['game-1/0.jpg', 'game-1/1.jpg'], 'game-1/0.jpg')

    expect(result).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({ intro_photo_paths: ['game-1/1.jpg'] })
    expect(storageFromMock).not.toHaveBeenCalled()
  })

  it('UPDATEに失敗した場合、falseが返ること', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await removeIntroPhoto('game-1', ['game-1/0.jpg'], 'game-1/0.jpg')

    expect(result).toBe(false)
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#ゲーム紹介画像の確認・自動補完-17、specs/board-game-rules/admin/design.md#ゲーム紹介画像を差し替え・削除する処理
describe('【管理画面】ゲーム紹介画像のメイン画像変更 - 指定画像を先頭へ移動してUPDATEする', () => {
  it('指定パスが先頭へ移動し、他のパスは順序を保ったまま後ろへずれた内容でUPDATEされること', async () => {
    const result = await setMainIntroPhoto('game-1', ['game-1/0.jpg', 'game-1/1.jpg', 'game-1/2.jpg'], 'game-1/2.jpg')

    expect(result).toBe(true)
    expect(updateMock).toHaveBeenCalledWith({
      intro_photo_paths: ['game-1/2.jpg', 'game-1/0.jpg', 'game-1/1.jpg'],
    })
  })

  it('UPDATEに失敗した場合、falseが返ること', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const result = await setMainIntroPhoto('game-1', ['game-1/0.jpg', 'game-1/1.jpg'], 'game-1/1.jpg')

    expect(result).toBe(false)
  })
})
