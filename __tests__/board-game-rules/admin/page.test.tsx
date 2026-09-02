import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminPage from '../../../app/board-game-rules/admin/page'
import { getSession, onAuthChange, isAuthorizedAdmin, signInWithGoogle, signOut } from '../../../app/lib/adminAuth'
import { fetchPublishedGames } from '../../../app/board-game-rules/lib/games'
import { fetchReports } from '../../../app/board-game-rules/admin/lib/fetchReports'
import {
  fetchGameRequests,
  deleteGameRequest,
  triggerRegistration,
  publishDraft,
} from '../../../app/board-game-rules/admin/lib/gameRequests'
import { fetchOriginalPhotos } from '../../../app/board-game-rules/admin/lib/photos'
import type { Session } from '@supabase/supabase-js'

vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  isAuthorizedAdmin: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../../../app/board-game-rules/lib/games', () => ({ fetchPublishedGames: vi.fn() }))
vi.mock('../../../app/board-game-rules/admin/lib/fetchReports', () => ({ fetchReports: vi.fn() }))
vi.mock('../../../app/board-game-rules/admin/lib/gameRequests', () => ({
  fetchGameRequests: vi.fn(),
  deleteGameRequest: vi.fn(),
  triggerRegistration: vi.fn(),
  requestRevision: vi.fn(),
  publishDraft: vi.fn(),
}))
vi.mock('../../../app/board-game-rules/admin/lib/photos', () => ({ fetchOriginalPhotos: vi.fn() }))
// GameRequestsViewが紹介画像プレビューに使う公開URL変換(gamePhotos.ts)は別spec(game-list T8)で検証済みのためモックする
vi.mock('../../../app/board-game-rules/lib/gamePhotos', () => ({
  getGamePhotoUrl: vi.fn((path: string) => `https://example.com/game-photos/${path}`),
}))

function makeSession(email: string): Session {
  return { user: { email } } as unknown as Session
}

// fetchPublishedGamesが返すGame相当(通報の対象ゲーム名の表示に使う。テストで必要な最小限)
function makePublishedGame(id: string, name: string) {
  return {
    id,
    name,
    minPlayers: 3,
    maxPlayers: 4,
    minMinutes: 60,
    maxMinutes: 90,
    genres: [],
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
  }
}

beforeEach(() => {
  vi.mocked(getSession).mockReset()
  vi.mocked(onAuthChange).mockReset().mockReturnValue(() => {})
  vi.mocked(isAuthorizedAdmin).mockReset()
  vi.mocked(signInWithGoogle).mockReset()
  vi.mocked(signOut).mockReset()
  vi.mocked(fetchPublishedGames).mockReset().mockResolvedValue([])
  vi.mocked(fetchReports).mockReset().mockResolvedValue([])
  vi.mocked(fetchGameRequests).mockReset().mockResolvedValue([])
  vi.mocked(deleteGameRequest).mockReset().mockResolvedValue(true)
  vi.mocked(triggerRegistration).mockReset().mockResolvedValue({ ok: true })
  vi.mocked(publishDraft).mockReset().mockResolvedValue({ ok: true })
  vi.mocked(fetchOriginalPhotos).mockReset().mockResolvedValue([])
})

// 仕様: specs/board-game-rules/admin/requirements.md#ログイン・アクセス制御-1、specs/board-game-rules/admin/requirements.md#ログイン・アクセス制御-3、specs/board-game-rules/admin/requirements.md#アクセス制御・権限-2
describe('【管理画面】未ログイン・権限なしでは管理データを一切取得しない', () => {
  it('未ログインのとき、ログイン案内が表示されデータ取得が行われないこと', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Googleでログイン' })).toBeTruthy())
    expect(fetchReports).not.toHaveBeenCalled()
  })

  it('権限がないとき、権限なしの案内が表示されデータ取得が行われないこと', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('other@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(false)
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText(/権限がありません/)).toBeTruthy())
    expect(fetchReports).not.toHaveBeenCalled()
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#通報の確認-6、specs/board-game-rules/admin/requirements.md#登録依頼の確認-8
describe('【管理画面】権限ありで通報一覧・登録依頼一覧を取得して表示する', () => {
  it('権限があるとき、通報一覧・登録依頼一覧が取得され、通報に対象ゲーム名が表示されること', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchPublishedGames).mockResolvedValue([makePublishedGame('game-1', 'カタン')] as never)
    vi.mocked(fetchReports).mockResolvedValue([
      { id: 'r1', gameId: 'game-1', reason: '内容が古い', createdAt: '2026-08-01T00:00:00.000Z' },
    ])

    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('カタン')).toBeTruthy())
    expect(fetchReports).toHaveBeenCalled()
    expect(fetchGameRequests).toHaveBeenCalled()
  })

  it('データ取得に失敗した場合、エラー表示になり一覧は表示されないこと', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchReports).mockRejectedValue(new Error('permission denied'))

    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText(/データの取得に失敗しました/)).toBeTruthy())
  })

  it('ログアウトボタンを押すとsignOutが呼ばれること', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)

    render(<AdminPage />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'ログアウト' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))
    expect(signOut).toHaveBeenCalled()
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録依頼の確認-10
describe('【管理画面】登録依頼の削除の操作が一覧に反映される', () => {
  it('削除を押すと、deleteGameRequestが呼ばれ一覧が再取得されること', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchGameRequests).mockResolvedValue([
      {
        id: 'req-1',
        photoPaths: [],
        introPhotoPaths: [],
        name: 'カタン',
        minPlayers: null,
        maxPlayers: null,
        minMinutes: null,
        maxMinutes: null,
        genres: [],
        minAge: null,
        difficulty: null,
        publisher: null,
        author: null,
        hasJapaneseRules: null,
        awards: null,
        releaseYear: null,
        createdAt: '2026-08-01T00:00:00.000Z',
        processedAt: null,
        status: 'pending',
        draftContent: null,
        revisionNote: null,
        revisionRound: 0,
        revisionHistory: [],
        errorMessage: null,
        publishedGameId: null,
      },
    ])

    render(<AdminPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    await waitFor(() => expect(deleteGameRequest).toHaveBeenCalledWith('req-1'))
    await waitFor(() => expect(fetchGameRequests).toHaveBeenCalledTimes(2))
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#画面レイアウト・回遊導線-13、specs/board-game-rules/admin/requirements.md#画面レイアウト・回遊導線-14、specs/board-game-rules/admin/requirements.md#画面レイアウト・回遊導線-15、specs/board-game-rules/admin/requirements.md#UI/UX要件-1、specs/board-game-rules/admin/requirements.md#UI/UX要件-2、specs/board-game-rules/admin/design.md#管理画面を共通chrome共通ナビ・パンくずで表示し回遊できるようにする処理
describe('【管理画面】共通ナビ・パンくずの枠(chrome)を全状態で表示し、他画面へ回遊できる', () => {
  it('未ログインのときも、共通ナビ(一覧・登録依頼・お気に入り)とパンくずが表示され、他画面へ回遊できること', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Googleでログイン' })).toBeTruthy())
    const nav = screen.getByRole('navigation', { name: '共通ナビ' })
    expect(within(nav).getByRole('link', { name: /一覧/ }).getAttribute('href')).toBe('/board-game-rules')
    const breadcrumb = screen.getByRole('navigation', { name: 'パンくず' })
    expect(within(breadcrumb).getByRole('link', { name: 'ボドゲのトリセツ' }).getAttribute('href')).toBe('/board-game-rules')
    expect(within(breadcrumb).getByText('管理')).toBeTruthy()
  })

  it('権限がないときも、共通ナビ・パンくずが表示されること', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('other@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(false)
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText(/権限がありません/)).toBeTruthy())
    expect(screen.getByRole('navigation', { name: '共通ナビ' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'パンくず' })).toBeTruthy()
  })

  it('データ取得に失敗した(取得エラー)ときも、共通ナビ・パンくずが表示されること', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchReports).mockRejectedValue(new Error('permission denied'))
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText(/データの取得に失敗しました/)).toBeTruthy())
    expect(screen.getByRole('navigation', { name: '共通ナビ' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'パンくず' })).toBeTruthy()
  })

  it('権限があるとき、共通ナビ・パンくずの枠内で通報一覧・登録依頼一覧が引き続き表示されること', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchPublishedGames).mockResolvedValue([makePublishedGame('game-1', 'カタン')] as never)
    vi.mocked(fetchReports).mockResolvedValue([
      { id: 'r1', gameId: 'game-1', reason: '内容が古い', createdAt: '2026-08-01T00:00:00.000Z' },
    ])

    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('カタン')).toBeTruthy())
    expect(screen.getByRole('navigation', { name: '共通ナビ' })).toBeTruthy()
    const breadcrumb = screen.getByRole('navigation', { name: 'パンくず' })
    expect(within(breadcrumb).getByRole('link', { name: 'べんりやつーる' }).getAttribute('href')).toBe('/')
  })
})
