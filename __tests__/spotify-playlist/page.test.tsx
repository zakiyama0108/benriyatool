import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SpotifyPlaylistPage from '@/app/spotify-playlist/page'
import { initializeSession, clearTokens, SpotifyAuthError } from '@/app/spotify-playlist/lib/spotifyAuth'
import {
  createPrivatePlaylist,
  addTracksToPlaylist,
  fetchMoreCandidates,
  SpotifyApiError,
  type TrackCandidate,
} from '@/app/spotify-playlist/lib/spotifyApi'
import { searchSongs, type SongSearchResult } from '@/app/spotify-playlist/lib/searchSongs'

vi.mock('@/app/spotify-playlist/lib/spotifyAuth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/spotify-playlist/lib/spotifyAuth')>()
  return { ...actual, initializeSession: vi.fn(), prepareAuthorization: vi.fn(), clearTokens: vi.fn() }
})
vi.mock('@/app/spotify-playlist/lib/spotifyApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/spotify-playlist/lib/spotifyApi')>()
  return {
    ...actual,
    createPrivatePlaylist: vi.fn(),
    addTracksToPlaylist: vi.fn(),
    fetchMoreCandidates: vi.fn(),
  }
})
vi.mock('@/app/spotify-playlist/lib/searchSongs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/app/spotify-playlist/lib/searchSongs')>()
  return { ...actual, searchSongs: vi.fn() }
})

const initSessionMock = vi.mocked(initializeSession)
const clearTokensMock = vi.mocked(clearTokens)
const searchSongsMock = vi.mocked(searchSongs)
const createPlaylistMock = vi.mocked(createPrivatePlaylist)
const addTracksMock = vi.mocked(addTracksToPlaylist)
const fetchMoreMock = vi.mocked(fetchMoreCandidates)

function track(id: string, title = id): TrackCandidate {
  return { id, uri: `spotify:track:${id}`, title, artist: 'a', album: 'b', albumArtUrl: null, durationMs: 180_000 }
}

// searchSongs をモックし、曲名→結果の対応表で各曲の結果を即座に通知する
function stubSearch(resultByName: (name: string) => SongSearchResult) {
  searchSongsMock.mockImplementation((names, onResult) => {
    names.forEach((name, index) => onResult(index, resultByName(name)))
    return Promise.resolve()
  })
}

async function renderLoggedIn() {
  initSessionMock.mockResolvedValue({
    status: 'loggedIn',
    user: { id: 'u1', displayName: 'さくら', imageUrl: null },
  })
  render(<SpotifyPlaylistPage />)
  await screen.findByText('曲名(1行に1曲)')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.restoreAllMocks()
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-1
describe('ログイン導線 - ログイン状態の判定中・未ログイン・ログイン中で表示を切り替える', () => {
  it('ログイン状態の判定中は、ゲート画面でも曲名入力画面でもなく全画面の読み込み表示になること', () => {
    initSessionMock.mockReturnValue(new Promise(() => {})) // 解決させない=判定中のまま
    render(<SpotifyPlaylistPage />)
    expect(screen.getByRole('status').textContent).toContain('読み込み中')
    expect(screen.queryByText('Spotifyでログイン')).toBeNull()
    expect(screen.queryByText('曲名(1行に1曲)')).toBeNull()
  })

  it('未ログイン時は説明文と「Spotifyでログイン」ボタンだけを表示し、曲名入力欄は出さないこと', async () => {
    initSessionMock.mockResolvedValue({ status: 'loggedOut' })
    render(<SpotifyPlaylistPage />)
    expect(await screen.findByRole('button', { name: 'Spotifyでログイン' })).toBeTruthy()
    expect(screen.queryByText('曲名(1行に1曲)')).toBeNull()
    expect(screen.queryByLabelText('プレイリスト名')).toBeNull()
  })

  it('ログイン中はヘッダーに表示名と「ログアウト」を出し、押すと未ログイン表示に戻ること', async () => {
    await renderLoggedIn()
    expect(screen.getByText('さくら')).toBeTruthy()
    expect(screen.getByText('共有端末では利用後にログアウトしてください')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(clearTokensMock).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Spotifyでログイン' })).toBeTruthy()
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-2、specs/spotify-playlist/playlist-create/requirements.md#機能要件-3、specs/spotify-playlist/playlist-create/requirements.md#機能要件-4、specs/spotify-playlist/playlist-create/requirements.md#候補の確定方法-1
describe('曲名の一括検索 - 入力を分割し、結果に応じて曲ごとの状態へ遷移する', () => {
  it('曲名は複数行のテキストエリアに1行1曲で入力できること', async () => {
    await renderLoggedIn()
    const textarea = screen.getByLabelText('曲名(1行に1曲)')
    expect(textarea.tagName).toBe('TEXTAREA')
    fireEvent.change(textarea, { target: { value: 'Lemon\nPretender' } })
    expect(textarea.value).toBe('Lemon\nPretender')
  })

  it('「検索する」で各曲が検索され、1件ヒットは自動採用・複数ヒットは未選択・0件は未ヒット表示になること', async () => {
    await renderLoggedIn()
    stubSearch((name) => {
      if (name === '無い曲') return { kind: 'notFound' }
      if (name === '一意な曲') return { kind: 'auto', candidate: track('x', '唯一の候補') }
      return { kind: 'multiple', candidates: [track('a', '候補A'), track('b', '候補B')], total: 5 }
    })
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), {
      target: { value: '無い曲\n一意な曲\n人気曲' },
    })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))

    await waitFor(() => expect(screen.getByText('見つかりませんでした')).toBeTruthy())
    expect(searchSongsMock.mock.calls[0][0]).toEqual(['無い曲', '一意な曲', '人気曲'])
    expect(screen.getByText('唯一の候補')).toBeTruthy()
    expect(screen.getByText('この曲を採用しました')).toBeTruthy() // 自動採用
    expect(screen.getByRole('button', { name: /候補A/ })).toBeTruthy() // 複数候補は一覧表示(未選択)
  })

  it('検索中は「検索する」ボタンがローディング表示になり無効化されること(連打で二重検索できない)', async () => {
    await renderLoggedIn()
    let resolveSearch: () => void = () => {}
    searchSongsMock.mockImplementation(() => new Promise<void>((resolve) => (resolveSearch = resolve)))
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: 'Lemon' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))

    const button = await screen.findByRole('button', { name: '検索中…' })
    expect((button as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(button)
    expect(searchSongsMock).toHaveBeenCalledTimes(1)
    resolveSearch()
  })

  it('101件目以降が検索対象外になった場合、その旨の注記を表示すること', async () => {
    await renderLoggedIn()
    stubSearch(() => ({ kind: 'notFound' }))
    const input = Array.from({ length: 105 }, (_, i) => `曲${i + 1}`).join('\n')
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: input } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByText(/101件目以降/)).toBeTruthy())
    expect(searchSongsMock.mock.calls[0][0]).toHaveLength(100)
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#曲名の入力-4
describe('曲名の再検索 - 「検索する」の再実行で前回の結果と採用候補をすべて破棄する', () => {
  it('再検索すると前回の検索結果カードが消え、新しい曲名一覧で検索し直されること', async () => {
    await renderLoggedIn()
    stubSearch((name) => ({ kind: 'auto', candidate: track(name, `${name}の候補`) }))

    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: '曲1' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByText('曲1の候補')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: '曲2' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByText('曲2の候補')).toBeTruthy())
    expect(screen.queryByText('曲1の候補')).toBeNull()
    expect(searchSongsMock.mock.calls[1][0]).toEqual(['曲2'])
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-7、specs/spotify-playlist/playlist-create/requirements.md#機能要件-8、specs/spotify-playlist/playlist-create/requirements.md#候補の確定方法-3、specs/spotify-playlist/playlist-create/requirements.md#候補の確定方法-4、specs/spotify-playlist/playlist-create/requirements.md#プレイリスト名-1、specs/spotify-playlist/playlist-create/requirements.md#プレイリストの公開範囲-1、specs/spotify-playlist/playlist-create/requirements.md#未ヒット曲の扱い-1
describe('プレイリストの作成 - 採用確定の曲だけを利用者本人のアカウントに非公開で作る', () => {
  async function searchThreeSongs() {
    // 未ヒット曲・未選択曲・自動採用曲を1件ずつ
    stubSearch((name) => {
      if (name === '無い曲') return { kind: 'notFound' }
      if (name === '迷う曲') return { kind: 'multiple', candidates: [track('m1'), track('m2')], total: 4 }
      return { kind: 'auto', candidate: track('auto1', 'オートトラック') }
    })
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), {
      target: { value: '無い曲\n迷う曲\n確定曲' },
    })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByText('オートトラック')).toBeTruthy())
  }

  it('採用候補が0件、またはプレイリスト名が空のとき「プレイリストを作成」は無効であること', async () => {
    await renderLoggedIn()
    stubSearch(() => ({ kind: 'notFound' }))
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: '無い曲' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByText('見つかりませんでした')).toBeTruthy())

    const createButton = screen.getByRole('button', { name: 'プレイリストを作成' })
    expect((createButton as HTMLButtonElement).disabled).toBe(true) // 採用0件
  })

  it('採用確定の曲だけを入力順に、非公開プレイリストを新規作成してから追加すること(未ヒット・未選択の曲は含めない)', async () => {
    await renderLoggedIn()
    await searchThreeSongs()
    createPlaylistMock.mockResolvedValue({ id: 'pl1', url: 'https://open.spotify.com/playlist/pl1' })
    addTracksMock.mockResolvedValue(undefined)

    fireEvent.change(screen.getByLabelText('プレイリスト名'), { target: { value: '  夜ドライブ  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'プレイリストを作成' }))

    await waitFor(() => expect(addTracksMock).toHaveBeenCalled())
    // 呼び出し順: 非公開作成 → 曲追加
    expect(createPlaylistMock).toHaveBeenCalledWith('夜ドライブ')
    // 採用確定(auto1)のみが追加対象。未ヒット・未選択は除外
    expect(addTracksMock).toHaveBeenCalledWith('pl1', ['spotify:track:auto1'])
  })

  it('曲追加が失敗した後に再度作成すると、新規プレイリストは作らず保持済みIDへの追加からやり直すこと', async () => {
    await renderLoggedIn()
    await searchThreeSongs()
    createPlaylistMock.mockResolvedValue({ id: 'pl1', url: 'https://open.spotify.com/playlist/pl1' })
    addTracksMock.mockRejectedValueOnce(new SpotifyApiError('通信エラー'))
    addTracksMock.mockResolvedValueOnce(undefined)

    fireEvent.change(screen.getByLabelText('プレイリスト名'), { target: { value: 'リトライ' } })
    fireEvent.click(screen.getByRole('button', { name: 'プレイリストを作成' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('通信エラー'))

    fireEvent.click(screen.getByRole('button', { name: 'プレイリストを作成' }))
    await waitFor(() => expect(screen.getByRole('link', { name: /作成したプレイリスト/ })).toBeTruthy())
    // createPrivatePlaylistは1回だけ(空プレイリストを増やさない)
    expect(createPlaylistMock).toHaveBeenCalledTimes(1)
    expect(addTracksMock).toHaveBeenCalledTimes(2)
  })

  it('作成中は「プレイリストを作成」ボタンがローディング表示になりさらに無効化されること', async () => {
    await renderLoggedIn()
    await searchThreeSongs()
    createPlaylistMock.mockResolvedValue({ id: 'pl1', url: 'u' })
    let resolveAdd: () => void = () => {}
    addTracksMock.mockImplementation(() => new Promise<void>((resolve) => (resolveAdd = resolve)))

    fireEvent.change(screen.getByLabelText('プレイリスト名'), { target: { value: '作成中テスト' } })
    fireEvent.click(screen.getByRole('button', { name: 'プレイリストを作成' }))
    const creating = await screen.findByRole('button', { name: '作成中…' })
    expect((creating as HTMLButtonElement).disabled).toBe(true)
    resolveAdd()
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#プレイリスト名-2
describe('プレイリスト名のバリデーションエラー - 400系の失敗は入力見直しを促す専用メッセージにする', () => {
  it('プレイリスト作成APIが400で失敗した場合、汎用の通信エラーではなくプレイリスト名の見直しを促すこと', async () => {
    await renderLoggedIn()
    stubSearch(() => ({ kind: 'auto', candidate: track('a1', '候補トラック') }))
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: '検索ワード' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByText('候補トラック')).toBeTruthy())

    createPlaylistMock.mockRejectedValue(new SpotifyApiError('bad request', { status: 400 }))
    fireEvent.change(screen.getByLabelText('プレイリスト名'), { target: { value: 'とても長い名前' } })
    fireEvent.click(screen.getByRole('button', { name: 'プレイリストを作成' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('プレイリスト名を短くするか変更'))
    expect(screen.getByRole('alert').textContent).not.toContain('通信エラー')
  })

  it('プレイリスト作成は成功し曲追加が400で失敗した場合は、プレイリスト名の専用メッセージではなく汎用の通信エラーを表示すること', async () => {
    await renderLoggedIn()
    stubSearch(() => ({ kind: 'auto', candidate: track('a1', '候補トラック') }))
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: '検索ワード' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByText('候補トラック')).toBeTruthy())

    createPlaylistMock.mockResolvedValue({ id: 'pl1', url: 'https://open.spotify.com/playlist/pl1' })
    addTracksMock.mockRejectedValue(new SpotifyApiError('bad request', { status: 400 }))
    fireEvent.change(screen.getByLabelText('プレイリスト名'), { target: { value: '通常の名前' } })
    fireEvent.click(screen.getByRole('button', { name: 'プレイリストを作成' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('通信エラー'))
    expect(screen.getByRole('alert').textContent).not.toContain('プレイリスト名を短くするか変更')
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-9、specs/spotify-playlist/playlist-create/requirements.md#機能要件-10、specs/spotify-playlist/playlist-create/requirements.md#機能要件-11
describe('作成完了表示・もう一度作る・ログアウト', () => {
  async function completeCreation() {
    await renderLoggedIn()
    stubSearch(() => ({ kind: 'auto', candidate: track('a1', 'ドライブトラック') }))
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: '確定曲' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByText('ドライブトラック')).toBeTruthy())
    createPlaylistMock.mockResolvedValue({ id: 'pl1', url: 'https://open.spotify.com/playlist/pl1' })
    addTracksMock.mockResolvedValue(undefined)
    fireEvent.change(screen.getByLabelText('プレイリスト名'), { target: { value: '完成' } })
    fireEvent.click(screen.getByRole('button', { name: 'プレイリストを作成' }))
    await screen.findByRole('link', { name: /作成したプレイリスト/ })
  }

  it('作成成功時に、作成したプレイリストへの実リンクを含む完了表示になること', async () => {
    await completeCreation()
    const link = screen.getByRole('link', { name: /作成したプレイリスト/ })
    expect(link.getAttribute('href')).toBe('https://open.spotify.com/playlist/pl1')
  })

  it('完了状態ではテキストエリア・「検索する」ボタンが操作不可(閲覧のみ)になること', async () => {
    await completeCreation()
    expect((screen.getByLabelText('曲名(1行に1曲)')).disabled).toBe(true)
    expect((screen.getByRole('button', { name: '検索する' })).disabled).toBe(true)
  })

  it('「もう一度作る」で曲名入力・検索結果・プレイリスト名が初期状態に戻り、ログイン状態は保たれること', async () => {
    await completeCreation()
    fireEvent.click(screen.getByRole('button', { name: 'もう一度作る' }))
    await waitFor(() => expect(screen.queryByText('ドライブトラック')).toBeNull())
    expect((screen.getByLabelText('曲名(1行に1曲)')).value).toBe('')
    expect(screen.getByText('さくら')).toBeTruthy() // ログインは維持
  })

  it('完了状態でもログアウトでき、押すと未ログイン表示に戻り検索結果・完了表示が破棄されること', async () => {
    await completeCreation()
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(clearTokensMock).toHaveBeenCalled()
    expect(await screen.findByRole('button', { name: 'Spotifyでログイン' })).toBeTruthy()
    expect(screen.queryByText('ドライブトラック')).toBeNull()
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-1
describe('セッション失効時の扱い - 一時的な通知を出してから未ログイン表示へ切り替える', () => {
  it('検索中にトークンの再発行が失敗したら、通知を表示してから未ログイン表示に切り替わること', async () => {
    vi.useFakeTimers()
    try {
      initSessionMock.mockResolvedValue({
        status: 'loggedIn',
        user: { id: 'u1', displayName: 'さくら', imageUrl: null },
      })
      render(<SpotifyPlaylistPage />)
      await vi.waitFor(() => expect(screen.getByText('曲名(1行に1曲)')).toBeTruthy())

      searchSongsMock.mockRejectedValue(new SpotifyAuthError('ログイン情報がありません'))
      fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: 'Lemon' } })
      fireEvent.click(screen.getByRole('button', { name: '検索する' }))

      // まず通知が出る(まだ未ログイン画面ではない)
      await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toContain('セッションの有効期限'))
      expect(screen.queryByRole('button', { name: 'Spotifyでログイン' })).toBeNull()

      // 猶予後に未ログイン表示へ
      await vi.advanceTimersByTimeAsync(3000)
      expect(clearTokensMock).toHaveBeenCalled()
      await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Spotifyでログイン' })).toBeTruthy())
    } finally {
      vi.useRealTimers()
    }
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#機能要件-5
describe('検索結果からの候補選択', () => {
  it('複数候補の曲で1件を選ぶと採用確定になり、採用曲数に数えられること', async () => {
    await renderLoggedIn()
    stubSearch(() => ({ kind: 'multiple', candidates: [track('a', '候補A'), track('b', '候補B')], total: 3 }))
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: '迷う曲' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /候補A/ })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: /候補B/ }))
    await waitFor(() => expect(screen.getByText('採用: 1曲')).toBeTruthy())
    expect(screen.getByRole('button', { name: /候補B/ }).getAttribute('aria-pressed')).toBe('true')
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#未ヒット曲の扱い-1
describe('未ヒット曲があっても作成をブロックしない', () => {
  it('未ヒット曲と採用確定曲が混在していても、採用確定曲だけでプレイリスト作成に進めること', async () => {
    await renderLoggedIn()
    stubSearch((name) =>
      name === '無い曲' ? { kind: 'notFound' } : { kind: 'auto', candidate: track('a1', '混在トラック') }
    )
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: '無い曲\n確定曲' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByText('混在トラック')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('プレイリスト名'), { target: { value: 'ミックス' } })
    expect((screen.getByRole('button', { name: 'プレイリストを作成' })).disabled).toBe(false)
  })
})

// 仕様: specs/spotify-playlist/playlist-create/requirements.md#候補の確定方法-2
describe('もっと見るによる候補の追加取得', () => {
  it('「もっと見る」を押すと追加の候補がその曲の一覧に足されること', async () => {
    await renderLoggedIn()
    stubSearch(() => ({
      kind: 'multiple',
      candidates: [track('a', '候補A'), track('b', '候補B')],
      total: 4,
    }))
    fireEvent.change(screen.getByLabelText('曲名(1行に1曲)'), { target: { value: '人気曲' } })
    fireEvent.click(screen.getByRole('button', { name: '検索する' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'もっと見る' })).toBeTruthy())

    fetchMoreMock.mockResolvedValue({ candidates: [track('c', '候補C'), track('d', '候補D')], total: 4 })
    fireEvent.click(screen.getByRole('button', { name: 'もっと見る' }))
    await waitFor(() => expect(screen.getByRole('button', { name: /候補D/ })).toBeTruthy())
    expect(fetchMoreMock).toHaveBeenCalledWith('人気曲', 2)
    // 全件取得済みなので「もっと見る」は消える
    expect(screen.queryByRole('button', { name: 'もっと見る' })).toBeNull()
  })
})
