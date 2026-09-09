import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import GameCard from '../../../app/board-game-rules/components/GameCard'
import { useSession } from '../../../app/board-game-rules/lib/useSession'
import type { Game } from '../../../app/board-game-rules/lib/games'

// お気に入り操作(FavoriteButton)が内部で参照するセッション状態・登録解除APIをモックする
// (仕様: favorite/design.md「一覧・詳細への追加(お気に入りボタン)」。FavoriteButton.test.tsxと同方針)
vi.mock('../../../app/board-game-rules/lib/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../../app/board-game-rules/lib/favorites', () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}))
// メイン画像の公開URL変換(gamePhotos.ts)は別spec(T8)で検証済みのためモックする
vi.mock('../../../app/board-game-rules/lib/gamePhotos', () => ({
  getGamePhotoUrl: vi.fn((path: string) => `https://example.com/game-photos/${path}`),
}))

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'game-1',
    name: 'カタン',
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: ['戦略', '交渉'] as Game['genres'],
    minAge: 8,
    difficulty: '普通',
    publisher: 'GP',
    author: 'クラウス・トイバー',
    hasJapaneseRules: true,
    awards: null,
    releaseYear: 1995,
    rulesSimple: '',
    rulesDetailed: [],
    introPhotoPaths: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

// 仕様: specs/board-game-rules/game-list/requirements.md#一覧表示-1
describe('【一覧カード】表示項目 - ゲーム名・対応人数・プレイ時間・ジャンルを表示する', () => {
  it('ゲーム名・対応人数(下限〜上限人)・プレイ時間(下限〜上限分)・ジャンルが表示されること', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
    render(<GameCard game={makeGame()} favorited={false} />)

    expect(screen.getByText('カタン')).toBeTruthy()
    expect(screen.getByText('3〜4人')).toBeTruthy()
    expect(screen.getByText('60〜90分')).toBeTruthy()
    expect(screen.getByText('戦略')).toBeTruthy()
    expect(screen.getByText('交渉')).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録実行のローカル処理起動-13、specs/board-game-rules/game-list/requirements.md#一覧表示-1
describe('【一覧カード】対応人数・プレイ時間が未登録(NULL)の場合の表示 - 「不明」と表示する', () => {
  it('対応人数・プレイ時間がともにNULLのとき、それぞれ「不明」と表示されること', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
    render(
      <GameCard
        game={makeGame({ minPlayers: null, maxPlayers: null, minMinutes: null, maxMinutes: null })}
        favorited={false}
      />
    )

    expect(screen.getByText('不明人')).toBeTruthy()
    expect(screen.getByText('不明分')).toBeTruthy()
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#一覧表示-2
describe('【一覧カード】詳細画面への遷移 - ゲーム名から詳細画面のURLへリンクする', () => {
  it('ゲーム名のリンク先が、そのゲームのIDを含む詳細画面URLであること', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
    render(<GameCard game={makeGame({ id: 'game-42' })} favorited={false} />)

    const link = screen.getByRole('link', { name: 'カタン' })
    expect(link.getAttribute('href')).toBe('/board-game-rules/detail?id=game-42')
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#一覧表示-4
describe('【一覧カード】お気に入り操作の出し分け - ログイン中のみお気に入りボタンを表示する', () => {
  it('未ログインでは、お気に入りボタンが表示されないこと', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
    render(<GameCard game={makeGame()} favorited={false} />)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('ログイン中は、お気に入りボタンが表示され、登録済み/未登録の状態が反映されること', () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    render(<GameCard game={makeGame()} favorited={true} />)

    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#画像表示-12
describe('【一覧カード】メイン画像の表示 - ゲーム紹介画像の並び順の先頭をサムネイルとして表示する', () => {
  it('ゲーム紹介画像が登録されている場合、先頭画像の公開URLがカード上部に表示されること', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
    render(<GameCard game={makeGame({ introPhotoPaths: ['game-1/0.jpg', 'game-1/1.jpg'] })} favorited={false} />)

    const image = screen.getByAltText<HTMLImageElement>('カタンのメイン画像')
    expect(image.src).toBe('https://example.com/game-photos/game-1/0.jpg')
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#画像表示-13
describe('【一覧カード】メイン画像未登録時の表示 - プレースホルダーにして表示崩れを防ぐ', () => {
  it('ゲーム紹介画像が0枚(未登録)の場合、プレースホルダーが表示され、メイン画像は表示されないこと', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
    render(<GameCard game={makeGame({ introPhotoPaths: [] })} favorited={false} />)

    expect(screen.getByLabelText('メイン画像未登録')).toBeTruthy()
    expect(screen.queryByAltText('カタンのメイン画像')).toBeNull()
  })
})

// 仕様: specs/board-game-rules/game-list/design.md#エラーハンドリング
describe('【一覧カード】メイン画像の読み込み失敗時の扱い - このカードだけプレースホルダーに切り替える', () => {
  it('表示中の画像でリンク切れ等の読み込みエラー(onError)が起きた場合、プレースホルダー表示へ切り替わること', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })
    render(<GameCard game={makeGame({ introPhotoPaths: ['game-1/0.jpg'] })} favorited={false} />)

    const image = screen.getByAltText('カタンのメイン画像')
    fireEvent.error(image)

    expect(screen.queryByAltText('カタンのメイン画像')).toBeNull()
    expect(screen.getByLabelText('メイン画像未登録')).toBeTruthy()
  })
})
