import { describe, it, expect, vi, beforeEach } from 'vitest'

const { createSignedUrlMock, storageFromMock } = vi.hoisted(() => {
  const createSignedUrlMock = vi.fn()
  const storageFromMock = vi.fn(() => ({ createSignedUrl: createSignedUrlMock }))
  return { createSignedUrlMock, storageFromMock }
})
vi.mock('../../../../app/lib/supabaseClient', () => ({ supabase: { storage: { from: storageFromMock } } }))

import { fetchOriginalPhotos } from '../../../../app/board-game-rules/admin/lib/photos'

beforeEach(() => {
  storageFromMock.mockClear()
  createSignedUrlMock.mockReset()
})

// 仕様: specs/board-game-rules/admin/requirements.md#投稿写真の照合閲覧-10、specs/board-game-rules/admin/design.md#元写真を照合閲覧する処理
describe('【管理画面】photo_pathsから非公開Storageの元写真を取得する - 運営者本人のみの照合閲覧', () => {
  it('各パスについて非公開Storageの署名付きURLを取得できること', async () => {
    createSignedUrlMock.mockResolvedValue({ data: { signedUrl: 'https://example.com/signed.jpg' }, error: null })

    const results = await fetchOriginalPhotos(['req-1/0.jpg', 'req-1/1.jpg'])

    expect(storageFromMock).toHaveBeenCalledWith('board-game-rules-photos')
    expect(createSignedUrlMock).toHaveBeenCalledTimes(2)
    expect(results).toEqual([
      { path: 'req-1/0.jpg', url: 'https://example.com/signed.jpg' },
      { path: 'req-1/1.jpg', url: 'https://example.com/signed.jpg' },
    ])
  })

  it('パスが0件のときは何も取得せず空配列を返すこと', async () => {
    const results = await fetchOriginalPhotos([])

    expect(createSignedUrlMock).not.toHaveBeenCalled()
    expect(results).toEqual([])
  })

  it('一部の写真取得に失敗しても、その写真だけurl:nullとし、他は取得できること', async () => {
    createSignedUrlMock
      .mockResolvedValueOnce({ data: { signedUrl: 'https://example.com/ok.jpg' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'not found' } })

    const results = await fetchOriginalPhotos(['ok.jpg', 'missing.jpg'])

    expect(results).toEqual([
      { path: 'ok.jpg', url: 'https://example.com/ok.jpg' },
      { path: 'missing.jpg', url: null },
    ])
  })
})
