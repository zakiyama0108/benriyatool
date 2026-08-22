import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import FavoritesPage from '../../../app/board-game-rules/favorites/page'
import { useSession } from '../../../app/board-game-rules/lib/useSession'
import { signInWithGoogle } from '../../../app/lib/adminAuth'
import { fetchMyFavoriteGames, removeFavorite, type FavoriteGame } from '../../../app/board-game-rules/lib/favorites'

vi.mock('../../../app/board-game-rules/lib/useSession', () => ({ useSession: vi.fn() }))
// isAuthorizedAdminは共通ナビの管理画面導線(AdminNavLink)が呼ぶ。本ファイルの検証対象外のため、
// 常に非運営者(false)としてリンクを出さない状態にする(AdminNavLink自体の出し分けはAdminNavLink.test.tsxで検証)
vi.mock('../../../app/lib/adminAuth', () => ({ signInWithGoogle: vi.fn(), isAuthorizedAdmin: vi.fn().mockResolvedValue(false) }))
vi.mock('../../../app/board-game-rules/lib/favorites', () => ({
  fetchMyFavoriteGames: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}))

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

function makeFavorite(overrides: Partial<FavoriteGame> = {}): FavoriteGame {
  return {
    favoriteId: 'fav-1',
    favoritedAt: '2026-08-01T00:00:00.000Z',
    game: {
      id: 'game-1',
      name: 'カタン',
      minPlayers: 3,
      maxPlayers: 4,
      minMinutes: 60,
      maxMinutes: 90,
      genres: ['対戦'],
      minAge: null,
      difficulty: null,
      publisher: null,
      author: null,
      hasJapaneseRules: null,
      awards: null,
      releaseYear: null,
      rulesSimple: '',
      rulesDetailed: [],
      introPhotoPaths: [],
      createdAt: '2026-08-01T00:00:00.000Z',
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// 仕様: specs/board-game-rules/game-list/design.md「ナビゲーション(左サイドバー共通ナビ)」
describe('【お気に入り一覧画面】パンくず - 「ボドゲのトリセツ」が一覧画面(/board-game-rules)へのリンクになること', () => {
  it('パンくずの「ボドゲのトリセツ」が/board-game-rulesへのリンクであること', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: true })

    render(<FavoritesPage />)

    const breadcrumb = screen.getByRole('navigation', { name: 'パンくず' })
    const link = within(breadcrumb).getByRole('link', { name: 'ボドゲのトリセツ' })
    expect(link.getAttribute('href')).toBe('/board-game-rules')
  })
})

// 仕様: specs/board-game-rules/favorite/design.md「状態管理」(セッション確認中・取得中はローディング表示のみ)
describe('お気に入り一覧ページ - セッション確認中・取得中はローディング表示のみを行う', () => {
  it('セッション確認中は、ログイン促し・一覧のどちらも出さず、読み込み中の表示のみが出ること', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: true })

    render(<FavoritesPage />)

    expect(screen.getByText(/読み込み中/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /ログイン/ })).toBeNull()
    expect(fetchMyFavoriteGames).not.toHaveBeenCalled()
  })

  it('セッションはあるがお気に入り取得中は、0件案内・一覧のどちらも出さず読み込み中の表示のみが出ること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    vi.mocked(fetchMyFavoriteGames).mockReturnValue(new Promise(() => {}))

    render(<FavoritesPage />)

    await waitFor(() => expect(fetchMyFavoriteGames).toHaveBeenCalled())
    expect(screen.getByText(/読み込み中/)).toBeTruthy()
    expect(screen.queryByText(/まだお気に入りがありません/)).toBeNull()
  })
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入り一覧-4
describe('お気に入り一覧ページ - 未ログインの場合は一覧を取得せずログインを促す', () => {
  it('セッションがない場合、一覧は取得されず、ログインを促す表示(ログイン操作)が表示されること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })

    render(<FavoritesPage />)

    await waitFor(() => expect(screen.getByRole('button', { name: /ログイン/ })).toBeTruthy())
    expect(fetchMyFavoriteGames).not.toHaveBeenCalled()
  })

  it('ログインボタンを押すと、現在のURLを戻り先にログインが開始されること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })

    render(<FavoritesPage />)
    fireEvent.click(await screen.findByRole('button', { name: /ログイン/ }))

    expect(signInWithGoogle).toHaveBeenCalledWith(window.location.href)
  })
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入り一覧-4
describe('お気に入り一覧ページ - ログイン中は自分のお気に入りを表示する', () => {
  it('お気に入りが0件の場合、「まだお気に入りがありません」の案内が表示されること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    vi.mocked(fetchMyFavoriteGames).mockResolvedValue([])

    render(<FavoritesPage />)

    await waitFor(() => expect(screen.getByText(/まだお気に入りがありません/)).toBeTruthy())
  })

  it('取得に失敗した場合も、「まだお気に入りがありません」の0件表示になること(失敗を画面に伝えない)', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    vi.mocked(fetchMyFavoriteGames).mockRejectedValue(new Error('network error'))

    render(<FavoritesPage />)

    await waitFor(() => expect(screen.getByText(/まだお気に入りがありません/)).toBeTruthy())
  })
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入り一覧-5、specs/board-game-rules/favorite/requirements.md#お気に入り一覧-7
describe('お気に入り一覧ページ - 1件以上ある場合、登録日時の新しい順にカード一覧を表示する', () => {
  it('fetchMyFavoriteGamesが返した順(登録日時の新しい順)でゲーム名が並び、詳細画面へのリンクを持つこと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    vi.mocked(fetchMyFavoriteGames).mockResolvedValue([
      makeFavorite({ favoriteId: 'fav-2', game: { ...makeFavorite().game, id: 'game-2', name: 'ドミニオン' } }),
      makeFavorite({ favoriteId: 'fav-1', game: { ...makeFavorite().game, id: 'game-1', name: 'カタン' } }),
    ])

    render(<FavoritesPage />)

    await waitFor(() => expect(screen.getByText('ドミニオン')).toBeTruthy())
    const list = screen.getByRole('list')
    const links = within(list).getAllByRole('link')
    expect(links.map((el) => el.textContent)).toEqual(['ドミニオン', 'カタン'])
    expect(links[0].getAttribute('href')).toBe('/board-game-rules/detail?id=game-2')
  })
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入り一覧-6
describe('お気に入り一覧ページ - 各項目からその場でお気に入りを解除できる', () => {
  it('解除操作を押して成功すると、詳細画面に戻らず一覧からその項目が消えること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    vi.mocked(fetchMyFavoriteGames).mockResolvedValue([
      makeFavorite({ favoriteId: 'fav-1', game: { ...makeFavorite().game, id: 'game-1', name: 'カタン' } }),
      makeFavorite({ favoriteId: 'fav-2', game: { ...makeFavorite().game, id: 'game-2', name: 'ドミニオン' } }),
    ])
    vi.mocked(removeFavorite).mockResolvedValue(true)

    render(<FavoritesPage />)
    await waitFor(() => expect(screen.getByText('カタン')).toBeTruthy())

    const buttons = screen.getAllByRole('button')
    fireEvent.click(buttons[0])

    expect(removeFavorite).toHaveBeenCalledWith('game-1')
    await waitFor(() => expect(screen.queryByText('カタン')).toBeNull())
    expect(screen.getByText('ドミニオン')).toBeTruthy()
  })
})
