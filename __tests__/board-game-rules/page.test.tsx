import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BoardGameRulesHomePage from '../../app/board-game-rules/page'
import { fetchPublishedGames } from '../../app/board-game-rules/lib/games'
import { useSession } from '../../app/board-game-rules/lib/useSession'
import { fetchMyFavoriteGameIds } from '../../app/board-game-rules/lib/favorites'
import type { Game } from '../../app/board-game-rules/lib/games'

vi.mock('../../app/board-game-rules/lib/games', () => ({ fetchPublishedGames: vi.fn() }))
vi.mock('../../app/board-game-rules/lib/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../app/board-game-rules/lib/favorites', () => ({
  fetchMyFavoriteGameIds: vi.fn(),
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}))
vi.mock('../../app/lib/adminAuth', () => ({ signInWithGoogle: vi.fn(), signOut: vi.fn() }))

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'game-1',
    name: 'カタン',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: ['戦略'],
    minAge: 8,
    difficulty: '普通',
    publisher: 'GP',
    author: 'クラウス・トイバー',
    hasJapaneseRules: true,
    awards: null,
    releaseYear: 1995,
    rulesSimple: '',
    rulesDetailed: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
  vi.mocked(fetchMyFavoriteGameIds).mockReset()
  vi.mocked(fetchPublishedGames).mockReset()
})

// 仕様: specs/board-game-rules/game-list/requirements.md#一覧表示-1、specs/board-game-rules/game-list/requirements.md#一覧表示-5
describe('【一覧画面】取得→絞り込み→表示 - 取得したゲームを一覧・件数表示に反映する', () => {
  it('取得成功後、全ゲームがカードとして表示され、件数が表示されること', async () => {
    vi.mocked(fetchPublishedGames).mockResolvedValue([
      makeGame({ id: 'game-1', name: 'カタン' }),
      makeGame({ id: 'game-2', name: 'ドミニオン' }),
    ])

    render(<BoardGameRulesHomePage />)

    await waitFor(() => expect(screen.getByText('カタン')).toBeTruthy())
    expect(screen.getByText('ドミニオン')).toBeTruthy()
    expect(screen.getByText('2件')).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-9、specs/board-game-rules/game-list/design.md#絞り込みを適用する処理、specs/board-game-rules/game-list/design.md#パフォーマンス
describe('【一覧画面】絞り込み条件の変更 - 再取得せず、取得済みデータへ適用する', () => {
  it('絞り込み条件を変更しても、fetchPublishedGamesは1回しか呼ばれず、一覧・件数が絞り込み後の内容に更新されること', async () => {
    vi.mocked(fetchPublishedGames).mockResolvedValue([
      makeGame({ id: 'game-1', name: 'カタン', author: 'クラウス・トイバー' }),
      makeGame({ id: 'game-2', name: 'ドミニオン', author: '宮本茂' }),
    ])

    render(<BoardGameRulesHomePage />)
    await waitFor(() => expect(screen.getByText('カタン')).toBeTruthy())
    expect(fetchPublishedGames).toHaveBeenCalledTimes(1)

    fireEvent.change(screen.getByLabelText('作者で検索'), { target: { value: '宮本' } })

    await waitFor(() => expect(screen.queryByText('カタン')).toBeNull())
    expect(screen.getByText('ドミニオン')).toBeTruthy()
    expect(screen.getByText('1件')).toBeTruthy()
    expect(fetchPublishedGames).toHaveBeenCalledTimes(1)
  })
})

// 仕様: specs/board-game-rules/game-list/design.md#エラーハンドリング
describe('【一覧画面】取得失敗時の表示 - 一覧を表示せず、失敗が分かる表示にする', () => {
  it('取得に失敗すると、失敗が分かる表示になり、ゲームのカードは表示されないこと', async () => {
    vi.mocked(fetchPublishedGames).mockRejectedValue(new Error('network error'))

    render(<BoardGameRulesHomePage />)

    await waitFor(() => expect(screen.getByText(/取得に失敗/)).toBeTruthy())
    expect(screen.queryByRole('list')).toBeNull()
  })
})

// 仕様: specs/board-game-rules/game-list/design.md#件数を表示する処理
describe('【一覧画面】絞り込み結果が0件のときの表示 - 取得エラーとは異なる「見つかりませんでした」の案内にする', () => {
  it('絞り込んだ結果が0件になると、件数が「0件」になり「見つかりませんでした」の案内が表示されること', async () => {
    vi.mocked(fetchPublishedGames).mockResolvedValue([makeGame({ id: 'game-1', name: 'カタン', author: 'クラウス・トイバー' })])

    render(<BoardGameRulesHomePage />)
    await waitFor(() => expect(screen.getByText('カタン')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('作者で検索'), { target: { value: '存在しない作者名' } })

    await waitFor(() => expect(screen.getByText('0件')).toBeTruthy())
    expect(screen.getByText('条件に合うゲームが見つかりませんでした')).toBeTruthy()
    expect(screen.queryByText(/取得に失敗/)).toBeNull()
  })
})

// 仕様: specs/board-game-rules/game-list/design.md#公開中のゲームを取得する処理
describe('【一覧画面】初期状態 - 絞り込み未指定のまま、取得した全件を登録日時の新しい順(取得順)で表示する', () => {
  it('初期表示では絞り込みを指定しておらず、取得した順番のまま全件が表示されること', async () => {
    vi.mocked(fetchPublishedGames).mockResolvedValue([
      makeGame({ id: 'game-2', name: 'ドミニオン', createdAt: '2026-08-02T00:00:00.000Z' }),
      makeGame({ id: 'game-1', name: 'カタン', createdAt: '2026-08-01T00:00:00.000Z' }),
    ])

    render(<BoardGameRulesHomePage />)

    await waitFor(() => expect(screen.getByText('ドミニオン')).toBeTruthy())
    const list = screen.getByRole('list')
    const names = within(list)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(names).toEqual(['ドミニオン', 'カタン'])
  })
})

// 仕様: specs/board-game-rules/favorite/design.md#画面内のお気に入り状態をまとめて取得する処理
describe('【一覧画面】お気に入り状態の反映 - ログイン中はまとめて取得した集合を各カードへ渡す', () => {
  it('未ログインでは、お気に入り状態の取得を行わないこと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
    vi.mocked(fetchPublishedGames).mockResolvedValue([makeGame({ id: 'game-1', name: 'カタン' })])

    render(<BoardGameRulesHomePage />)

    await waitFor(() => expect(screen.getByText('カタン')).toBeTruthy())
    expect(fetchMyFavoriteGameIds).not.toHaveBeenCalled()
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#一覧表示-3
describe('【一覧画面】未ログインでの利用 - 一覧の閲覧・絞り込みはログイン不要で利用できる', () => {
  it('未ログインのまま、ログインを求めるブロック表示なしに一覧のカード・絞り込みパネルが操作できること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
    vi.mocked(fetchPublishedGames).mockResolvedValue([makeGame({ id: 'game-1', name: 'カタン' })])

    render(<BoardGameRulesHomePage />)

    await waitFor(() => expect(screen.getByText('カタン')).toBeTruthy())
    expect(screen.getByLabelText('作者で検索')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'カタン' })).toBeTruthy()
    expect(screen.queryByText(/ログインが必要/)).toBeNull()
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-8、specs/board-game-rules/game-list/design.md#絞り込みをリセットする処理
describe('【一覧画面】絞り込みのリセット - すべての条件を解除し、全公開ゲームを登録日時の新しい順で表示する状態に戻す', () => {
  it('絞り込んだ後にリセットすると、件数・一覧が取得直後の全件・取得順に戻ること', async () => {
    vi.mocked(fetchPublishedGames).mockResolvedValue([
      makeGame({ id: 'game-2', name: 'ドミニオン', author: '宮本茂', createdAt: '2026-08-02T00:00:00.000Z' }),
      makeGame({ id: 'game-1', name: 'カタン', author: 'クラウス・トイバー', createdAt: '2026-08-01T00:00:00.000Z' }),
    ])

    render(<BoardGameRulesHomePage />)
    await waitFor(() => expect(screen.getByText('ドミニオン')).toBeTruthy())

    fireEvent.change(screen.getByLabelText('作者で検索'), { target: { value: '宮本' } })
    await waitFor(() => expect(screen.getByText('1件')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: '絞り込み条件を開閉する' }))
    fireEvent.click(screen.getByRole('button', { name: 'リセット' }))

    await waitFor(() => expect(screen.getByText('2件')).toBeTruthy())
    const list = screen.getByRole('list')
    const names = within(list)
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(names).toEqual(['ドミニオン', 'カタン'])
  })
})

// 仕様: specs/board-game-rules/game-list/design.md#パンくず
describe('【一覧画面】パンくず - register/favoritesと同じ3階層(べんりやつーる › ボドゲのトリセツ › 一覧)', () => {
  it('パンくずに「べんりやつーる」「ボドゲのトリセツ」への戻りリンクと、現在地「一覧」が表示されること', async () => {
    vi.mocked(fetchPublishedGames).mockResolvedValue([makeGame({ id: 'game-1', name: 'カタン' })])

    render(<BoardGameRulesHomePage />)
    await waitFor(() => expect(screen.getByText('カタン')).toBeTruthy())

    const breadcrumb = screen.getByRole('navigation', { name: 'パンくず' })
    const hubLink = within(breadcrumb).getByRole('link', { name: 'べんりやつーる' })
    expect(hubLink.getAttribute('href')).toBe('/')
    const appLink = within(breadcrumb).getByRole('link', { name: 'ボドゲのトリセツ' })
    expect(appLink.getAttribute('href')).toBe('/board-game-rules')
    expect(within(breadcrumb).getByText('一覧')).toBeTruthy()
    expect(within(breadcrumb).queryByRole('link', { name: '一覧' })).toBeNull()
  })
})
