import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import GameDetailPage from '../../../app/board-game-rules/detail/page'
import type { Game } from '../../../app/board-game-rules/lib/games'
import { fetchGameById } from '../../../app/board-game-rules/lib/games'
import { fetchMyFavoriteGameIds } from '../../../app/board-game-rules/lib/favorites'
import { useSession } from '../../../app/board-game-rules/lib/useSession'
import { isAuthorizedAdmin } from '../../../app/lib/adminAuth'

// 取得系・セッションはモックし、重い子コンポーネントは配置確認用のマーカーに差し替える。
// これにより「クエリIDでの取得・状態の出し分け・各導線の配置」だけを検証する
// lib/games を丸ごとモックする(実体を読み込むとsupabaseClientの環境変数チェックに引っかかるため)。
// Game/FetchGameResult は型のみの利用でランタイム依存はない
vi.mock('../../../app/board-game-rules/lib/games', () => ({ fetchGameById: vi.fn() }))
vi.mock('../../../app/board-game-rules/lib/favorites', () => ({ fetchMyFavoriteGameIds: vi.fn() }))
vi.mock('../../../app/board-game-rules/lib/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../../app/lib/adminAuth', () => ({ isAuthorizedAdmin: vi.fn() }))
vi.mock('../../../app/board-game-rules/components/AdminControls', () => ({
  default: ({ game }: { game: { id: string } }) => <div data-testid="admin-controls">{game.id}</div>,
}))
vi.mock('../../../app/board-game-rules/lib/gamePhotos', () => ({
  getGamePhotoUrl: (path: string) => `https://cdn.example/${path}`,
}))
vi.mock('../../../app/board-game-rules/components/BoardGameNav', () => ({
  default: () => <nav data-testid="nav" />,
}))
vi.mock('../../../app/board-game-rules/components/CommentSection', () => ({
  default: ({ gameId }: { gameId: string }) => <div data-testid="comment-section">{gameId}</div>,
}))
vi.mock('../../../app/board-game-rules/components/ReportButton', () => ({
  default: ({ gameId }: { gameId: string }) => <div data-testid="report-button">{gameId}</div>,
}))
vi.mock('../../../app/board-game-rules/components/FavoriteButton', () => ({
  default: ({ gameId, initialFavorited }: { gameId: string; initialFavorited: boolean }) => (
    <div data-testid="favorite-button" data-fav={String(initialFavorited)}>
      {gameId}
    </div>
  ),
}))

const GAME_ID = '11111111-1111-4111-8111-111111111111'

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: GAME_ID,
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
    rulesSimple: 'かんたん要約',
    rulesDetailed: [],
    introPhotoPaths: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeSession(userId: string): Session {
  return { user: { id: userId, email: `${userId}@example.com`, user_metadata: {} } } as Session
}

function setQuery(id: string) {
  window.history.replaceState({}, '', `/board-game-rules/detail?id=${id}`)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
  vi.mocked(fetchMyFavoriteGameIds).mockResolvedValue(new Set())
  vi.mocked(isAuthorizedAdmin).mockResolvedValue(false)
  vi.mocked(fetchGameById).mockResolvedValue({ status: 'found', game: makeGame() })
  setQuery(GAME_ID)
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#基本情報の表示-1、specs/board-game-rules/game-detail/requirements.md#操作-6、specs/board-game-rules/game-detail/requirements.md#操作-7
describe('ゲーム詳細画面 - クエリのIDでゲームを取得し、分類情報・ルール・コメント・通報導線を配置する', () => {
  it('URLのidでfetchGameByIdを呼び、取得したゲームの分類情報とルール本文が表示されること', async () => {
    render(<GameDetailPage />)

    await waitFor(() => expect(fetchGameById).toHaveBeenCalledWith(GAME_ID))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'カタン' })).toBeTruthy())
    expect(screen.getByText('かんたん要約')).toBeTruthy()
  })

  it('コメント欄と通報導線が、対象ゲームのIDで配置されること', async () => {
    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getByTestId('comment-section')).toBeTruthy())
    expect(screen.getByTestId('comment-section').textContent).toBe(GAME_ID)
    expect(screen.getByTestId('report-button').textContent).toBe(GAME_ID)
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#操作-8
describe('ゲーム詳細画面 - 閲覧はログイン不要', () => {
  it('未ログインでもゲームを取得・表示すること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })

    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'カタン' })).toBeTruthy())
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#操作-5
describe('ゲーム詳細画面 - ログイン中は現在のお気に入り状態を初期値としてお気に入り導線に渡す', () => {
  it('ログイン中で対象がお気に入り済みのとき、お気に入り導線に登録済み(true)を渡すこと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('user-1'), loading: false })
    vi.mocked(fetchMyFavoriteGameIds).mockResolvedValue(new Set([GAME_ID]))

    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getByTestId('favorite-button').getAttribute('data-fav')).toBe('true'))
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#画像表示-9
describe('ゲーム詳細画面 - 紹介画像が0枚のときはギャラリーを表示しない', () => {
  it('intro_photo_pathsが空のとき、画像が1枚も表示されないこと', async () => {
    vi.mocked(fetchGameById).mockResolvedValue({ status: 'found', game: makeGame({ introPhotoPaths: [] }) })

    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'カタン' })).toBeTruthy())
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('intro_photo_pathsが1枚以上あるとき、ギャラリー画像が表示されること', async () => {
    vi.mocked(fetchGameById).mockResolvedValue({ status: 'found', game: makeGame({ introPhotoPaths: ['g/0.jpg'] }) })

    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getAllByRole('img').length).toBeGreaterThan(0))
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#表示対象-1、specs/board-game-rules/game-detail/design.md#エラーハンドリング
describe('ゲーム詳細画面 - 該当なしと取得エラーを区別して表示する', () => {
  it('該当ゲームが無いとき、「見つかりません」の趣旨の表示になること', async () => {
    vi.mocked(fetchGameById).mockResolvedValue({ status: 'notFound' })

    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getByText(/見つかりません/)).toBeTruthy())
  })

  it('取得に失敗したとき、エラー表示と再試行手段が出て、再試行で再取得されること', async () => {
    vi.mocked(fetchGameById).mockResolvedValueOnce({ status: 'error' })

    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getByText(/失敗|エラー/)).toBeTruthy())
    vi.mocked(fetchGameById).mockResolvedValue({ status: 'found', game: makeGame() })
    fireEvent.click(screen.getByRole('button', { name: /再試行/ }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'カタン' })).toBeTruthy())
  })
})

// 仕様: specs/board-game-rules/game-detail/requirements.md#運営者操作のアクセス制御-7
describe('ゲーム詳細画面 - 運営者ログイン時のみ管理者導線を表示する', () => {
  it('運営者(isAuthorizedAdminがtrue)ログイン時は管理者メニューが表示されること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('admin-1'), loading: false })
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)

    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getByTestId('admin-controls')).toBeTruthy())
    expect(screen.getByTestId('admin-controls').textContent).toBe(GAME_ID)
  })

  it('未ログインでは管理者導線を表示しないこと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })

    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'カタン' })).toBeTruthy())
    expect(screen.queryByTestId('admin-controls')).toBeNull()
  })

  it('一般ログイン利用者(isAuthorizedAdminがfalse)には管理者導線を表示しないこと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('user-1'), loading: false })
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(false)

    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'カタン' })).toBeTruthy())
    expect(screen.queryByTestId('admin-controls')).toBeNull()
  })

  it('運営者判定が例外を投げた場合は管理者導線を表示しないこと(フェイルクローズ)', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('admin-1'), loading: false })
    vi.mocked(isAuthorizedAdmin).mockRejectedValue(new Error('network error'))

    render(<GameDetailPage />)

    await waitFor(() => expect(screen.getByRole('heading', { name: 'カタン' })).toBeTruthy())
    expect(screen.queryByTestId('admin-controls')).toBeNull()
  })
})
