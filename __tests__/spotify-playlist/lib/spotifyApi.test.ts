import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import {
  searchTracks,
  fetchMoreCandidates,
  getCurrentUserId,
  createPrivatePlaylist,
  addTracksToPlaylist,
  SpotifyApiError,
} from '@/app/spotify-playlist/lib/spotifyApi'
import { getFreshAccessToken } from '@/app/spotify-playlist/lib/spotifyAuth'

vi.mock('@/app/spotify-playlist/lib/spotifyAuth', () => ({
  getFreshAccessToken: vi.fn(),
}))
const getTokenMock = vi.mocked(getFreshAccessToken)

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

// Spotifyの検索APIが返すトラック1件分の最小形
function trackObject(id: string, name: string) {
  return {
    id,
    uri: `spotify:track:${id}`,
    name,
    duration_ms: 210_000,
    artists: [{ name: 'ミスチル' }, { name: '桜井和寿' }],
    album: { name: 'アルバムA', images: [{ url: `https://img/${id}.jpg` }] },
  }
}

function searchPayload(ids: string[], total: number) {
  return { tracks: { items: ids.map((id) => trackObject(id, `曲${id}`)), total } }
}

let fetchMock: MockInstance<typeof fetch>

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  getTokenMock.mockResolvedValue('access-token-123')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-3、specs/spotify-playlist/playlist-create/requirements.md#機能要件-4、specs/spotify-playlist/playlist-create/requirements.md#機能要件-6
describe('曲名でのSpotify検索 - 曲名1件ごとに0件/1件/複数件を呼び出し元が扱いやすい形で返す', () => {
  it('検索結果が0件の曲は「見つからなかった」を表す結果になること', async () => {
    fetchMock.mockResolvedValue(jsonResponse(searchPayload([], 0)))
    await expect(searchTracks('存在しない曲')).resolves.toEqual({ kind: 'notFound' })
  })

  it('検索結果がちょうど1件の曲は、その1件が自動採用候補として返ること(アーティスト名は連結される)', async () => {
    fetchMock.mockResolvedValue(jsonResponse(searchPayload(['t1'], 1)))
    const outcome = await searchTracks('唯一ヒットする曲')
    expect(outcome).toEqual({
      kind: 'auto',
      candidate: {
        id: 't1',
        uri: 'spotify:track:t1',
        title: '曲t1',
        artist: 'ミスチル, 桜井和寿',
        album: 'アルバムA',
        albumArtUrl: 'https://img/t1.jpg',
        durationMs: 210_000,
      },
    })
  })

  it('検索結果が複数件の曲は、上位5件の候補一覧とSpotify側の総件数が返ること', async () => {
    fetchMock.mockResolvedValue(jsonResponse(searchPayload(['a', 'b', 'c', 'd', 'e'], 42)))
    const outcome = await searchTracks('人気曲')
    expect(outcome.kind).toBe('multiple')
    if (outcome.kind !== 'multiple') return
    expect(outcome.candidates).toHaveLength(5)
    expect(outcome.total).toBe(42)
    // limit=5 で検索している
    expect((fetchMock.mock.calls[0][0] as string)).toContain('limit=5')
  })

  it('検索前にアクセストークンの自動リフレッシュ処理を経由し、Bearerトークン付きで呼ぶこと', async () => {
    fetchMock.mockResolvedValue(jsonResponse(searchPayload([], 0)))
    await searchTracks('曲')
    expect(getTokenMock).toHaveBeenCalled()
    const headers = fetchMock.mock.calls[0][1]?.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer access-token-123')
  })

  it('「もっと見る」ではoffsetを指定して次の5件と総件数を取得すること', async () => {
    fetchMock.mockResolvedValue(jsonResponse(searchPayload(['f', 'g'], 7)))
    const result = await fetchMoreCandidates('人気曲', 5)
    expect(result.candidates.map((c) => c.id)).toEqual(['f', 'g'])
    expect(result.total).toBe(7)
    expect((fetchMock.mock.calls[0][0] as string)).toContain('offset=5')
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-3
describe('曲検索の失敗時の扱い - 通信エラーとレート制限を区別して伝える', () => {
  it('通信エラー時はSpotifyApiErrorを投げること', async () => {
    fetchMock.mockRejectedValue(new TypeError('failed to fetch'))
    await expect(searchTracks('曲')).rejects.toBeInstanceOf(SpotifyApiError)
  })

  it('レート制限(429)を受けた場合、Retry-Afterの秒数をエラー情報として保持すること(自動リトライはしない)', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '17' } }))
    await expect(searchTracks('曲')).rejects.toMatchObject({ retryAfterSeconds: 17, status: 429 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-8
describe('自ユーザー情報の取得・プレイリスト作成・曲追加 - 利用者本人のアカウントに非公開で作る', () => {
  it('GET /v1/me からユーザーIDを取得すること', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 'me-123', display_name: 'a' }))
    await expect(getCurrentUserId()).resolves.toBe('me-123')
    expect((fetchMock.mock.calls[0][0] as string)).toContain('/me')
  })

  it('プレイリストは public: false(非公開)で作成し、作成されたIDとリンクを返すこと', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ id: 'pl-1', external_urls: { spotify: 'https://open.spotify.com/playlist/pl-1' } })
    )
    const created = await createPrivatePlaylist('me-123', 'ドライブ用')
    expect(created).toEqual({ id: 'pl-1', url: 'https://open.spotify.com/playlist/pl-1' })
    const sentBody = JSON.parse((fetchMock.mock.calls[0][1]?.body as string) ?? '{}') as Record<string, unknown>
    expect(sentBody).toMatchObject({ name: 'ドライブ用', public: false })
  })

  it('作成したプレイリストへトラックURIの配列を追加できること', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ snapshot_id: 's1' }))
    await addTracksToPlaylist('pl-1', ['spotify:track:a', 'spotify:track:b'])
    const sentBody = JSON.parse((fetchMock.mock.calls[0][1]?.body as string) ?? '{}') as Record<string, unknown>
    expect(sentBody).toEqual({ uris: ['spotify:track:a', 'spotify:track:b'] })
  })

  it('いずれの呼び出しも直前にアクセストークンの自動リフレッシュ処理を経由すること', async () => {
    // 呼び出しごとにボディを読めるよう、都度新しいResponseを返す
    fetchMock.mockImplementation(() =>
      Promise.resolve(jsonResponse({ id: 'x', external_urls: { spotify: 'u' } }))
    )
    await getCurrentUserId()
    await createPrivatePlaylist('u', 'n')
    await addTracksToPlaylist('p', ['spotify:track:a'])
    expect(getTokenMock).toHaveBeenCalledTimes(3)
  })

  it('通信エラー時はいずれもSpotifyApiErrorを投げること', async () => {
    fetchMock.mockRejectedValue(new TypeError('network'))
    await expect(getCurrentUserId()).rejects.toBeInstanceOf(SpotifyApiError)
    await expect(createPrivatePlaylist('u', 'n')).rejects.toBeInstanceOf(SpotifyApiError)
    await expect(addTracksToPlaylist('p', ['spotify:track:a'])).rejects.toBeInstanceOf(SpotifyApiError)
  })

  it('プレイリスト作成が400系で失敗した場合、ステータスコードをエラー情報として保持すること(プレイリスト名の見直し案内に使う)', async () => {
    fetchMock.mockResolvedValue(new Response('{"error":{"status":400}}', { status: 400 }))
    await expect(createPrivatePlaylist('u', '長すぎる名前')).rejects.toMatchObject({ status: 400 })
  })

  it('曲追加がレート制限(429)を受けた場合、Retry-Afterをエラー情報として保持すること', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 429, headers: { 'Retry-After': '5' } }))
    await expect(addTracksToPlaylist('p', ['spotify:track:a'])).rejects.toMatchObject({ retryAfterSeconds: 5 })
  })
})
