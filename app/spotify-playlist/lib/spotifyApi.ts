// Spotify Web APIの呼び出しラッパー。曲検索・自ユーザー情報取得・プレイリスト作成・曲追加を扱う。
// いずれの呼び出しも直前にgetFreshAccessTokenを経由し、期限切れのアクセストークンを自動で
// 再発行してから使う(design.md#アクセストークンを自動更新する処理)。
import { getFreshAccessToken } from './spotifyAuth'

const API_BASE = 'https://api.spotify.com/v1'

// 曲検索・候補一覧の1曲分。albumArtUrlは取得できないことがある(画像の無いトラック)。
export type TrackCandidate = {
  id: string
  // プレイリストへの追加に使うトラックURI(spotify:track:xxxx)
  uri: string
  title: string
  artist: string
  album: string
  albumArtUrl: string | null
  durationMs: number
}

// 1曲名分の検索結果。呼び出し元(page.tsx)が曲の状態へそのまま倒せる形にしておく
// (design.md#曲名を一括検索する処理 手順4-6)。
export type SearchOutcome =
  | { kind: 'notFound' }
  | { kind: 'auto'; candidate: TrackCandidate } // 結果1件 → 自動採用
  | { kind: 'multiple'; candidates: TrackCandidate[]; total: number } // 結果複数件 → 利用者が選ぶ

// Spotify APIの失敗を画面の定型メッセージへ翻訳するために投げるエラー。
// status・retryAfterSeconds・detailは技術情報としてconsole.errorに出す用(画面には出さない、design.md#エラーハンドリング)。
export class SpotifyApiError extends Error {
  constructor(
    message: string,
    readonly detail?: { status?: number; retryAfterSeconds?: number; cause?: unknown }
  ) {
    super(message)
    this.name = 'SpotifyApiError'
  }
  get status(): number | undefined {
    return this.detail?.status
  }
  get retryAfterSeconds(): number | undefined {
    return this.detail?.retryAfterSeconds
  }
}

type SpotifyTrackObject = {
  id: string
  uri: string
  name: string
  duration_ms: number
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
}

function toCandidate(track: SpotifyTrackObject): TrackCandidate {
  return {
    id: track.id,
    uri: track.uri,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    albumArtUrl: track.album.images[0]?.url ?? null,
    durationMs: track.duration_ms,
  }
}

// 認証ヘッダ付きでSpotify APIを1回呼ぶ。通信エラー・429・想定外ステータスを
// SpotifyApiErrorへ正規化する(design.md#エラーハンドリング)。
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const accessToken = await getFreshAccessToken()
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })
  } catch (cause) {
    throw new SpotifyApiError('通信エラーが発生しました', { cause })
  }

  if (response.status === 429) {
    // レート制限。待機時間は記録するだけで自動リトライはしない(design.md#エラーハンドリング)
    const retryAfterSeconds = Number(response.headers.get('Retry-After')) || undefined
    throw new SpotifyApiError('アクセスが集中しています', { status: 429, retryAfterSeconds })
  }
  if (!response.ok) {
    throw new SpotifyApiError('Spotifyの応答が想定外でした', { status: response.status })
  }
  return response
}

// -------------------- 曲検索 --------------------

type SearchApiResponse = { tracks: { items: SpotifyTrackObject[]; total: number } }

async function rawTrackSearch(query: string, offset: number): Promise<{ items: SpotifyTrackObject[]; total: number }> {
  // 1回あたり上位5件(design.md#曲名を一括検索する処理 手順3)
  const params = new URLSearchParams({ q: query, type: 'track', limit: '5', offset: String(offset) })
  const response = await apiFetch(`/search?${params.toString()}`)
  const data = (await response.json()) as SearchApiResponse
  return { items: data.tracks.items, total: data.tracks.total }
}

// 曲名で検索し、0件/1件/複数件を呼び出し元が扱いやすい形で返す(design.md#曲名を一括検索する処理 手順4-6)。
export async function searchTracks(query: string): Promise<SearchOutcome> {
  const { items, total } = await rawTrackSearch(query, 0)
  if (total === 0 || items.length === 0) return { kind: 'notFound' }
  if (total === 1) return { kind: 'auto', candidate: toCandidate(items[0]) }
  return { kind: 'multiple', candidates: items.map(toCandidate), total }
}

// 「もっと見る」で次の5件を追加取得する(design.md#曲名を一括検索する処理 手順5)。
// totalも返し、取得済み件数がtotalに達したかを呼び出し元が判定できるようにする。
export async function fetchMoreCandidates(
  query: string,
  offset: number
): Promise<{ candidates: TrackCandidate[]; total: number }> {
  const { items, total } = await rawTrackSearch(query, offset)
  return { candidates: items.map(toCandidate), total }
}

// -------------------- プレイリスト作成・曲追加 --------------------
// 2026年2月のSpotify Web API移行(february-2026-migration-guide)により、
// プレイリスト作成は/users/{user_id}/playlistsから/me/playlistsへ、
// 曲追加は/playlists/{id}/tracksから/playlists/{id}/itemsへエンドポイントが変更された。
// /me/playlistsはアクセストークンの持ち主に対して作成するためユーザーIDの指定が不要になった。

export type CreatedPlaylist = { id: string; url: string }

// 非公開(public: false)でプレイリストを新規作成する(requirements.md#プレイリストの公開範囲-1)。
export async function createPrivatePlaylist(name: string): Promise<CreatedPlaylist> {
  const response = await apiFetch('/me/playlists', {
    method: 'POST',
    body: JSON.stringify({ name, public: false }),
  })
  const data = (await response.json()) as { id: string; external_urls: { spotify: string } }
  return { id: data.id, url: data.external_urls.spotify }
}

// 作成したプレイリストへトラックURIを入力順に追加する(design.md#プレイリストを作成する処理 手順4)。
// 対象は最大100件のためSpotifyの1リクエスト上限内に収まり、分割呼び出しはしない(requirements.md#曲名の入力-2)。
export async function addTracksToPlaylist(playlistId: string, trackUris: string[]): Promise<void> {
  await apiFetch(`/playlists/${encodeURIComponent(playlistId)}/items`, {
    method: 'POST',
    body: JSON.stringify({ uris: trackUris }),
  })
}
