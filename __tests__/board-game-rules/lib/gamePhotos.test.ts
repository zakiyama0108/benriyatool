import { describe, it, expect, vi, beforeEach } from 'vitest'

const { getPublicUrlMock, storageFromMock } = vi.hoisted(() => {
  const getPublicUrlMock = vi.fn()
  const storageFromMock = vi.fn(() => ({ getPublicUrl: getPublicUrlMock }))
  return { getPublicUrlMock, storageFromMock }
})
vi.mock('../../../app/lib/supabaseClient', () => ({ supabase: { storage: { from: storageFromMock } } }))

import { getGamePhotoUrl } from '../../../app/board-game-rules/lib/gamePhotos'

beforeEach(() => {
  storageFromMock.mockClear()
  getPublicUrlMock.mockReset()
})

// 仕様: specs/board-game-rules/game-list/requirements.md#画像表示-12
describe('【ゲーム紹介画像】Storageパスから公開URLへの変換 - 公開Storageバケットの公開URLを返す', () => {
  it('公開Storageバケット(board-game-rules-game-photos)のパスを渡すと、そのバケットの公開URLが返ること', () => {
    getPublicUrlMock.mockReturnValue({ data: { publicUrl: 'https://example.com/game-photos/game-1/0.jpg' } })

    const url = getGamePhotoUrl('game-1/0.jpg')

    expect(storageFromMock).toHaveBeenCalledWith('board-game-rules-game-photos')
    expect(getPublicUrlMock).toHaveBeenCalledWith('game-1/0.jpg')
    expect(url).toBe('https://example.com/game-photos/game-1/0.jpg')
  })
})
