'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSpotifyAuth } from './lib/useSpotifyAuth'
import { parseSongInput, hasSearchableSong } from './lib/songNames'
import { searchSongs, type SongSearchResult } from './lib/searchSongs'
import {
  fetchMoreCandidates,
  createPrivatePlaylist,
  addTracksToPlaylist,
  SpotifyApiError,
  type TrackCandidate,
} from './lib/spotifyApi'
import { SpotifyAuthError } from './lib/spotifyAuth'
import SongResultCard, { type SongCardState } from './components/SongResultCard'
import CreateBar from './components/CreateBar'

// 画面に出すエラーは日本語の定型文にする(design.md#エラーハンドリング。生のエラーは出さない)。
const GENERIC_ERROR = '通信エラーが発生しました。時間をおいて再度お試しください。'
const PLAYLIST_NAME_ERROR = 'プレイリスト名を短くするか変更してお試しください。'
const SESSION_EXPIRED_NOTICE = 'セッションの有効期限が切れました。お手数ですが再度ログインしてください。'
// セッション失効の通知を見せてから未ログイン表示へ切り替えるまでの猶予
const SESSION_EXPIRED_SWITCH_MS = 2500

// 曲1件あたりの画面状態(design.md#状態管理)。
type SongItem = {
  key: string
  name: string
  status: SongCardState
  candidates: TrackCandidate[]
  selectedId: string | null
  // Spotify側の総候補数(「もっと見る」表示の判定に使う)
  total: number
  loadingMore: boolean
}

type CreatePhase = 'input' | 'creating' | 'done'

function applySearchResult(song: SongItem, result: SongSearchResult): SongItem {
  switch (result.kind) {
    case 'notFound':
      return { ...song, status: '見つからなかった', candidates: [], selectedId: null, total: 0 }
    case 'searchFailed':
      return { ...song, status: '検索失敗', candidates: [], selectedId: null, total: 0 }
    case 'auto':
      return { ...song, status: '採用確定', candidates: [result.candidate], selectedId: result.candidate.id, total: 1 }
    case 'multiple':
      return { ...song, status: '未選択', candidates: result.candidates, selectedId: null, total: result.total }
  }
}

export default function SpotifyPlaylistPage() {
  const { auth, login, clearSession } = useSpotifyAuth()

  const [songInput, setSongInput] = useState('')
  const [songs, setSongs] = useState<SongItem[]>([])
  const [searching, setSearching] = useState(false)
  const [ignoredCount, setIgnoredCount] = useState(0)
  const [playlistName, setPlaylistName] = useState('')
  const [phase, setPhase] = useState<CreatePhase>('input')
  const [doneUrl, setDoneUrl] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  // 曲追加だけが失敗した再実行に備えて保持する作成済みプレイリストID(design.md#プレイリストを作成する処理 手順4)
  const [createdPlaylistId, setCreatedPlaylistId] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)

  // 採用候補が確定している曲を入力順に、選択中の候補へ解決する(design.md#プレイリストを作成する処理 手順2)
  const adoptedCandidates = useMemo(
    () =>
      songs
        .filter((song) => song.status === '採用確定' && song.selectedId)
        .map((song) => song.candidates.find((candidate) => candidate.id === song.selectedId))
        .filter((candidate): candidate is TrackCandidate => candidate != null),
    [songs]
  )

  const readOnly = phase !== 'input'
  const canSearch = phase === 'input' && !searching && hasSearchableSong(songInput)
  const canCreate = adoptedCandidates.length > 0 && playlistName.trim().length > 0

  // セッション失効: 一時的な通知を出してから未ログイン表示へ切り替える(design.md#アクセストークンを自動更新する処理)
  const expireSession = useCallback(() => {
    setSessionExpired(true)
    setPhase('input')
    window.setTimeout(() => {
      setSessionExpired(false)
      clearSession()
    }, SESSION_EXPIRED_SWITCH_MS)
  }, [clearSession])

  const handleSearch = useCallback(async () => {
    const { names, ignoredCount: ignored } = parseSongInput(songInput)
    if (names.length === 0) return

    // それまでの検索結果・採用候補・作成状態をすべて破棄して検索し直す(requirements.md#曲名の入力-4)
    setIgnoredCount(ignored)
    setCreateError(null)
    setCreatedPlaylistId(null)
    setDoneUrl(null)
    setPhase('input')
    setSongs(
      names.map((name, index): SongItem => ({
        key: `${index}:${name}`,
        name,
        status: '検索中',
        candidates: [],
        selectedId: null,
        total: 0,
        loadingMore: false,
      }))
    )
    setSearching(true)
    try {
      await searchSongs(names, (index, result) => {
        setSongs((prev) => prev.map((song, i) => (i === index ? applySearchResult(song, result) : song)))
      })
    } catch (error) {
      if (error instanceof SpotifyAuthError) expireSession()
    } finally {
      setSearching(false)
    }
  }, [songInput, expireSession])

  const handleSelect = useCallback((index: number, candidateId: string) => {
    setSongs((prev) =>
      prev.map((song, i) => (i === index ? { ...song, status: '採用確定', selectedId: candidateId } : song))
    )
  }, [])

  const handleLoadMore = useCallback(
    async (index: number) => {
      const song = songs[index]
      if (!song) return
      setSongs((prev) => prev.map((s, i) => (i === index ? { ...s, loadingMore: true } : s)))
      try {
        const { candidates, total } = await fetchMoreCandidates(song.name, song.candidates.length)
        setSongs((prev) =>
          prev.map((s, i) =>
            i === index ? { ...s, candidates: [...s.candidates, ...candidates], total, loadingMore: false } : s
          )
        )
      } catch (error) {
        setSongs((prev) => prev.map((s, i) => (i === index ? { ...s, loadingMore: false } : s)))
        if (error instanceof SpotifyAuthError) expireSession()
      }
    },
    [songs, expireSession]
  )

  const handleCreate = useCallback(async () => {
    if (!canCreate) return
    setPhase('creating')
    setCreateError(null)
    const trackUris = adoptedCandidates.map((candidate) => candidate.uri)
    let playlistId = createdPlaylistId
    // 今回の呼び出しでプレイリスト作成ステップを実行中かどうか(400の原因切り分けに使う。
    // createdPlaylistIdは再レンダー前は更新されないため、useCallbackクロージャ内のローカル変数で判定する)
    let creatingPlaylistStep = false

    try {
      if (!playlistId) {
        creatingPlaylistStep = true
        const created = await createPrivatePlaylist(playlistName.trim())
        creatingPlaylistStep = false
        playlistId = created.id
        setCreatedPlaylistId(created.id)
        setDoneUrl(created.url)
      }
      await addTracksToPlaylist(playlistId, trackUris)
      setPhase('done')
    } catch (error) {
      setPhase('input')
      if (error instanceof SpotifyAuthError) {
        expireSession()
        return
      }
      // プレイリスト作成ステップ自体が400で失敗した場合のみ、プレイリスト名の見直しを促す(design.md#エラーハンドリング)。
      // 曲追加ステップの400はここに含めない(仕様上はプレイリスト作成APIのバリデーションエラーに限定するため)
      if (error instanceof SpotifyApiError && error.status === 400 && creatingPlaylistStep) {
        setCreateError(PLAYLIST_NAME_ERROR)
      } else {
        setCreateError(GENERIC_ERROR)
      }
    }
  }, [canCreate, adoptedCandidates, createdPlaylistId, playlistName, expireSession])

  const handleReset = useCallback(() => {
    setSongInput('')
    setSongs([])
    setIgnoredCount(0)
    setPlaylistName('')
    setPhase('input')
    setDoneUrl(null)
    setCreateError(null)
    setCreatedPlaylistId(null)
  }, [])

  // ---------- 描画 ----------

  if (auth.status === 'checking') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-sp-bg text-sp-subtext">
        <p role="status">読み込み中…</p>
      </main>
    )
  }

  if (auth.status === 'loggedOut') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-sp-bg px-6 text-center">
        <header className="absolute top-0 left-0 p-4 text-sm font-bold text-sp-text">曲名からプレイリスト作成</header>
        {sessionExpired && (
          <p role="alert" className="rounded-lg bg-sp-surface px-4 py-2 text-sm text-sp-subtext">
            {SESSION_EXPIRED_NOTICE}
          </p>
        )}
        <p className="max-w-sm text-sm text-sp-subtext">
          聴きたい曲の曲名をまとめて入力するだけで、あなたのSpotifyアカウントに新しいプレイリストを作成します。
        </p>
        <button
          type="button"
          onClick={() => void login()}
          className="rounded-full bg-sp-green px-6 py-2.5 text-sm font-bold text-sp-on-green hover:bg-sp-green-hover"
        >
          Spotifyでログイン
        </button>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col bg-sp-bg text-sp-text">
      <header className="flex items-center justify-between border-b border-sp-line px-4 py-3">
        <span className="text-sm font-bold">曲名からプレイリスト作成</span>
        <div className="flex items-center gap-3">
          {auth.user.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- Spotify CDNのプロフィール画像をそのまま表示する
            <img src={auth.user.imageUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
          )}
          <span className="text-xs text-sp-subtext">{auth.user.displayName}</span>
          <button
            type="button"
            onClick={clearSession}
            className="rounded-full border border-sp-line px-3 py-1 text-xs font-bold hover:bg-sp-surface-hover"
          >
            ログアウト
          </button>
        </div>
      </header>
      <p className="px-4 pt-2 text-[11px] text-sp-subtext">共有端末では利用後にログアウトしてください</p>
      {sessionExpired && (
        <p role="alert" className="mx-4 mt-2 rounded-lg bg-sp-surface px-4 py-2 text-sm text-sp-subtext">
          {SESSION_EXPIRED_NOTICE}
        </p>
      )}

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-4 px-4 py-4">
        <div className="space-y-2">
          <label htmlFor="song-input" className="block text-sm font-bold">
            曲名(1行に1曲)
          </label>
          <textarea
            id="song-input"
            value={songInput}
            onChange={(event) => setSongInput(event.target.value)}
            disabled={readOnly}
            rows={6}
            className="w-full rounded-lg border border-sp-line bg-sp-surface p-3 text-sm text-sp-text placeholder:text-sp-subtext disabled:opacity-60"
            placeholder={'Lemon\nPretender\n夜に駆ける'}
          />
          {ignoredCount > 0 && (
            <p className="text-xs text-sp-subtext">101件目以降({ignoredCount}件)は検索対象外です</p>
          )}
          <button
            type="button"
            onClick={() => void handleSearch()}
            disabled={!canSearch}
            className="rounded-full bg-sp-green px-5 py-1.5 text-sm font-bold text-sp-on-green hover:bg-sp-green-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {searching ? '検索中…' : '検索する'}
          </button>
        </div>

        {songs.length > 0 && (
          <div className="space-y-3">
            {songs.map((song, index) => (
              <SongResultCard
                key={song.key}
                songName={song.name}
                state={song.status}
                candidates={song.candidates}
                selectedId={song.selectedId}
                hasMore={song.candidates.length < song.total}
                loadingMore={song.loadingMore}
                readOnly={readOnly}
                onSelect={(id) => handleSelect(index, id)}
                onLoadMore={() => void handleLoadMore(index)}
              />
            ))}
          </div>
        )}
      </div>

      {(songs.length > 0 || phase !== 'input') && (
        <CreateBar
          adoptedCount={adoptedCandidates.length}
          playlistName={playlistName}
          onPlaylistNameChange={setPlaylistName}
          disabled={!canCreate}
          isCreating={phase === 'creating'}
          onCreate={() => void handleCreate()}
          errorMessage={createError}
          completedUrl={phase === 'done' ? doneUrl : null}
          onReset={handleReset}
        />
      )}
    </main>
  )
}
