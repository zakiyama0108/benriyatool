import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fromMock, createSignedUrlMock, storageFromMock } = vi.hoisted(() => {
  const createSignedUrlMock = vi.fn()
  const storageFromMock = vi.fn(() => ({ createSignedUrl: createSignedUrlMock }))
  return { fromMock: vi.fn(), createSignedUrlMock, storageFromMock }
})
vi.mock('../../../app/lib/supabaseClient', () => ({
  supabase: { from: fromMock, storage: { from: storageFromMock } },
}))

import { fetchOriginalPhotos } from '../../../app/board-game-rules/lib/originalPhotos'

// board_game_rules_games からの photo_paths 取得(運営者は全列SELECT可)をモックする
function setupPhotoPaths(result: { data: unknown; error: unknown }) {
  const maybeSingleMock = vi.fn().mockResolvedValue(result)
  const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockImplementation((table: string) => {
    if (table !== 'board_game_rules_games') throw new Error(`unexpected table: ${table}`)
    return { select: selectMock }
  })
  return { selectMock, eqMock }
}

beforeEach(() => {
  fromMock.mockReset()
  createSignedUrlMock.mockReset().mockResolvedValue({ data: { signedUrl: 'https://signed/url' }, error: null })
  storageFromMock.mockClear()
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#運営者向けの操作(管理者ログイン時)-13、specs/board-game-rules/game-detail/requirements.md#表示対象-2
describe('元写真の照合閲覧 - 運営者だけが非公開Storageの元写真を取得する', () => {
  it('対象ゲームのphoto_pathsを取得し、非公開バケットの署名URLへ変換して返すこと', async () => {
    setupPhotoPaths({ data: { photo_paths: ['uuid/0.jpg', 'uuid/1.jpg'] }, error: null })

    const result = await fetchOriginalPhotos('game-1')

    expect(storageFromMock).toHaveBeenCalledWith('board-game-rules-photos')
    expect(result).toEqual([
      { path: 'uuid/0.jpg', url: 'https://signed/url' },
      { path: 'uuid/1.jpg', url: 'https://signed/url' },
    ])
  })

  it('一部の写真の署名URL発行に失敗しても、その写真だけurl:nullにして他は返すこと(全体を失敗させない)', async () => {
    setupPhotoPaths({ data: { photo_paths: ['uuid/0.jpg', 'uuid/1.jpg'] }, error: null })
    createSignedUrlMock
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed/0' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'not found' } })

    const result = await fetchOriginalPhotos('game-1')

    expect(result).toEqual([
      { path: 'uuid/0.jpg', url: 'https://signed/0' },
      { path: 'uuid/1.jpg', url: null },
    ])
  })

  it('元写真が0枚(空配列)の場合は空配列を返し、署名URL発行を呼ばないこと', async () => {
    setupPhotoPaths({ data: { photo_paths: [] }, error: null })

    const result = await fetchOriginalPhotos('game-1')

    expect(result).toEqual([])
    expect(createSignedUrlMock).not.toHaveBeenCalled()
  })

  it('photo_pathsの取得に失敗した場合は空配列を返すこと', async () => {
    setupPhotoPaths({ data: null, error: { message: 'permission denied' } })

    const result = await fetchOriginalPhotos('game-1')

    expect(result).toEqual([])
  })
})
