import { describe, it, expect, vi, beforeEach } from 'vitest'

const { uploadMock, storageFromMock, insertMock, fromMock } = vi.hoisted(() => {
  const uploadMock = vi.fn()
  const storageFromMock = vi.fn(() => ({ upload: uploadMock }))
  const insertMock = vi.fn()
  const fromMock = vi.fn(() => ({ insert: insertMock }))
  return { uploadMock, storageFromMock, insertMock, fromMock }
})

vi.mock('../../../app/lib/supabaseClient', () => ({
  supabase: { from: fromMock, storage: { from: storageFromMock } },
}))

import { createGameRequest } from '../../../app/board-game-rules/lib/gameRequests'

function makePhoto(name = 'photo1.jpg'): File {
  return new File(['dummy'], name, { type: 'image/jpeg' })
}

beforeEach(() => {
  fromMock.mockClear()
  storageFromMock.mockClear()
  uploadMock.mockReset().mockResolvedValue({ data: { path: 'uploaded/path.jpg' }, error: null })
  insertMock.mockReset().mockResolvedValue({ data: null, error: null })
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#依頼の送信-5、specs/board-game-rules/game-registration/requirements.md#分類情報の任意入力-3
describe('【登録依頼】写真+分類情報から登録依頼を送信する - 写真を非公開Storageに保存してからDBへINSERTする', () => {
  it('写真1枚+分類情報(すべて任意)を渡すと、写真が非公開Storageに保存され、依頼がINSERTされてtrueが返ること', async () => {
    const result = await createGameRequest({
      photos: [makePhoto()],
      name: 'カタン',
      minPlayers: 3,
      maxPlayers: 4,
      minMinutes: 60,
      maxMinutes: 90,
      genres: ['対戦', '戦略'],
    })

    expect(result).toBe(true)
    expect(storageFromMock).toHaveBeenCalledWith('board-game-rules-photos')
    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(fromMock).toHaveBeenCalledWith('board_game_rules_game_requests')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'カタン',
        min_players: 3,
        max_players: 4,
        min_minutes: 60,
        max_minutes: 90,
        genres: ['対戦', '戦略'],
        photo_paths: ['uploaded/path.jpg'],
      })
    )
  })

  it('分類情報をすべて省略しても(写真のみ)、依頼を送信できること', async () => {
    const result = await createGameRequest({ photos: [makePhoto()] })

    expect(result).toBe(true)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: null,
        min_players: null,
        max_players: null,
        genres: [],
        photo_paths: ['uploaded/path.jpg'],
      })
    )
  })

  it('写真が複数枚あれば、すべて保存されてパスがまとめてINSERTされること', async () => {
    uploadMock
      .mockResolvedValueOnce({ data: { path: 'req-1/0.jpg' }, error: null })
      .mockResolvedValueOnce({ data: { path: 'req-1/1.jpg' }, error: null })

    await createGameRequest({ photos: [makePhoto('a.jpg'), makePhoto('b.jpg')] })

    expect(uploadMock).toHaveBeenCalledTimes(2)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ photo_paths: ['req-1/0.jpg', 'req-1/1.jpg'] })
    )
  })

  it('写真が0枚の場合は送信されず(Storage保存・INSERTとも呼ばれず)falseが返ること(画面側で送信ボタンを無効化する防御の裏付け)', async () => {
    const result = await createGameRequest({ photos: [] })

    expect(result).toBe(false)
    expect(uploadMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('対応人数が下限>上限の場合は送信されずfalseが返ること', async () => {
    const result = await createGameRequest({ photos: [makePhoto()], minPlayers: 5, maxPlayers: 2 })

    expect(result).toBe(false)
    expect(uploadMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('プレイ時間が下限>上限の場合は送信されずfalseが返ること', async () => {
    const result = await createGameRequest({ photos: [makePhoto()], minMinutes: 90, maxMinutes: 30 })

    expect(result).toBe(false)
    expect(uploadMock).not.toHaveBeenCalled()
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('対応人数・プレイ時間とも下限=上限(境界値)は送信できること', async () => {
    const result = await createGameRequest({
      photos: [makePhoto()],
      minPlayers: 4,
      maxPlayers: 4,
      minMinutes: 30,
      maxMinutes: 30,
    })

    expect(result).toBe(true)
  })

  it('写真のStorage保存に失敗した場合、DBへのINSERTは行われずfalseが返ること', async () => {
    uploadMock.mockResolvedValue({ data: null, error: { message: 'storage error' } })

    const result = await createGameRequest({ photos: [makePhoto()] })

    expect(result).toBe(false)
    expect(insertMock).not.toHaveBeenCalled()
  })

  it('依頼のINSERTに失敗した場合、falseが返ること', async () => {
    insertMock.mockResolvedValue({ data: null, error: { message: 'insert error' } })

    const result = await createGameRequest({ photos: [makePhoto()] })

    expect(result).toBe(false)
  })

  it('処理中に例外が発生した場合も、falseで正常終了すること', async () => {
    uploadMock.mockRejectedValue(new Error('network error'))

    await expect(createGameRequest({ photos: [makePhoto()] })).resolves.toBe(false)
  })
})
