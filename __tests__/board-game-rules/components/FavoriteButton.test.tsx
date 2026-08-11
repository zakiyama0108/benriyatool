import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import FavoriteButton from '../../../app/board-game-rules/components/FavoriteButton'
import { useSession } from '../../../app/board-game-rules/lib/useSession'
import { addFavorite, removeFavorite } from '../../../app/board-game-rules/lib/favorites'

// セッション状態はuseSessionから、登録・解除はlib/favoritesから来るため、
// いずれもモックして「表示の出し分けとトグル操作の呼び出し」だけを検証する
vi.mock('../../../app/board-game-rules/lib/useSession', () => ({ useSession: vi.fn() }))
vi.mock('../../../app/board-game-rules/lib/favorites', () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}))

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

beforeEach(() => {
  vi.clearAllMocks()
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入りの登録・解除-2
describe('お気に入りボタン - 未ログインでは操作を表示しない(ログイン導線はヘッダーのLoginStatusに集約)', () => {
  it('未ログインのとき、ボタン自体が表示されないこと', () => {
    vi.mocked(useSession).mockReturnValue({ session: null, loading: false })

    const { container } = render(<FavoriteButton gameId="game-1" initialFavorited={false} />)

    expect(container.firstChild).toBeNull()
  })
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入りの登録・解除-3
describe('お気に入りボタン - ログイン中は登録済み/未登録がひと目で分かること', () => {
  it('未登録のゲームでは「未登録」の見た目(aria-pressed=false)であること', () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })

    render(<FavoriteButton gameId="game-1" initialFavorited={false} />)

    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-pressed')).toBe('false')
  })

  it('登録済みのゲームでは「登録済み」の見た目(aria-pressed=true)であること', () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })

    render(<FavoriteButton gameId="game-1" initialFavorited={true} />)

    const button = screen.getByRole('button')
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入りの登録・解除-1
describe('お気に入りボタン - トグル操作で登録・解除を行い、成功したら表示を切り替える', () => {
  it('未登録のゲームを押すとaddFavoriteが呼ばれ、成功すると「登録済み」表示に切り替わり、呼び出し元へ通知されること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    vi.mocked(addFavorite).mockResolvedValue(true)
    const onToggle = vi.fn()

    render(<FavoriteButton gameId="game-1" initialFavorited={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))

    expect(addFavorite).toHaveBeenCalledWith('game-1')
    await waitFor(() => expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true'))
    expect(onToggle).toHaveBeenCalledWith('game-1', true)
  })

  it('登録済みのゲームを押すとremoveFavoriteが呼ばれ、成功すると「未登録」表示に切り替わり、呼び出し元へ通知されること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    vi.mocked(removeFavorite).mockResolvedValue(true)
    const onToggle = vi.fn()

    render(<FavoriteButton gameId="game-1" initialFavorited={true} onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button'))

    expect(removeFavorite).toHaveBeenCalledWith('game-1')
    await waitFor(() => expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false'))
    expect(onToggle).toHaveBeenCalledWith('game-1', false)
  })
})

// 仕様: specs/board-game-rules/favorite/design.md#エラーハンドリング
describe('お気に入りボタン - 処理中は無効化し、失敗時は表示を戻して失敗が分かる表示をする', () => {
  it('処理が完了するまでボタンが無効化され、二重登録・二重解除を防ぐこと', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    let resolveAdd: (value: boolean) => void = () => {}
    vi.mocked(addFavorite).mockReturnValue(new Promise((resolve) => (resolveAdd = resolve)))

    render(<FavoriteButton gameId="game-1" initialFavorited={false} />)
    fireEvent.click(screen.getByRole('button'))

    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(true)

    resolveAdd(true)
    await waitFor(() => expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false))
  })

  it('登録に失敗した場合、表示は「未登録」のまま戻り、失敗が分かる表示が出ること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    vi.mocked(addFavorite).mockResolvedValue(false)

    render(<FavoriteButton gameId="game-1" initialFavorited={false} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(screen.getByText(/失敗/)).toBeTruthy())
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false)
  })

  it('解除に失敗した場合、表示は「登録済み」のまま戻り、失敗が分かる表示が出ること', async () => {
    vi.mocked(useSession).mockReturnValue({ session: makeSession('taro@example.com'), loading: false })
    vi.mocked(removeFavorite).mockResolvedValue(false)

    render(<FavoriteButton gameId="game-1" initialFavorited={true} />)
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(screen.getByText(/失敗/)).toBeTruthy())
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true')
  })
})
