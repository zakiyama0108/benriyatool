import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminPage from '../../../app/board-game-rules/admin/page'
import { getSession, onAuthChange, isAuthorizedAdmin, signInWithGoogle, signOut } from '../../../app/lib/adminAuth'
import { fetchAdminGames } from '../../../app/board-game-rules/admin/lib/fetchAdminGames'
import { fetchReports } from '../../../app/board-game-rules/admin/lib/fetchReports'
import {
  fetchGameRequests,
  markGameRequestProcessed,
  deleteGameRequest,
} from '../../../app/board-game-rules/admin/lib/gameRequests'
import { editGame, deleteGame } from '../../../app/board-game-rules/admin/lib/moderation'
import { fetchOriginalPhotos } from '../../../app/board-game-rules/admin/lib/photos'
import type { Session } from '@supabase/supabase-js'
import type { AdminGame } from '../../../app/board-game-rules/admin/lib/fetchAdminGames'

vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  isAuthorizedAdmin: vi.fn(),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../../../app/board-game-rules/admin/lib/fetchAdminGames', () => ({ fetchAdminGames: vi.fn() }))
vi.mock('../../../app/board-game-rules/admin/lib/fetchReports', () => ({ fetchReports: vi.fn() }))
vi.mock('../../../app/board-game-rules/admin/lib/gameRequests', () => ({
  fetchGameRequests: vi.fn(),
  markGameRequestProcessed: vi.fn(),
  deleteGameRequest: vi.fn(),
}))
vi.mock('../../../app/board-game-rules/admin/lib/moderation', () => ({
  editGame: vi.fn(),
  deleteGame: vi.fn(),
  deleteComment: vi.fn(),
}))
vi.mock('../../../app/board-game-rules/admin/lib/photos', () => ({ fetchOriginalPhotos: vi.fn() }))

function makeSession(email: string): Session {
  return { user: { email } } as unknown as Session
}

function makeGame(overrides: Partial<AdminGame> = {}): AdminGame {
  return {
    id: 'game-1',
    name: 'カタン',
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
    deletedAt: null,
    photoPaths: [],
    reportCount: 0,
    ...overrides,
  }
}

beforeEach(() => {
  vi.mocked(getSession).mockReset()
  vi.mocked(onAuthChange).mockReset().mockReturnValue(() => {})
  vi.mocked(isAuthorizedAdmin).mockReset()
  vi.mocked(signInWithGoogle).mockReset()
  vi.mocked(signOut).mockReset()
  vi.mocked(fetchAdminGames).mockReset().mockResolvedValue([])
  vi.mocked(fetchReports).mockReset().mockResolvedValue([])
  vi.mocked(fetchGameRequests).mockReset().mockResolvedValue([])
  vi.mocked(markGameRequestProcessed).mockReset().mockResolvedValue(true)
  vi.mocked(deleteGameRequest).mockReset().mockResolvedValue(true)
  vi.mocked(editGame).mockReset().mockResolvedValue(true)
  vi.mocked(deleteGame).mockReset().mockResolvedValue(true)
  vi.mocked(fetchOriginalPhotos).mockReset().mockResolvedValue([])
})

// 仕様: specs/board-game-rules/admin/requirements.md#ログイン・アクセス制御-1、specs/board-game-rules/admin/requirements.md#アクセス制御・権限-2、specs/board-game-rules/admin/design.md#ログイン状態を判定して画面を出し分ける処理、specs/board-game-rules/admin/design.md#閲覧権限を確認する処理
describe('【管理画面】未ログイン・権限なしでは管理データを一切取得しない', () => {
  it('未ログインのとき、ログイン案内が表示されデータ取得が行われないこと', async () => {
    vi.mocked(getSession).mockResolvedValue(null)
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByRole('button', { name: 'Googleでログイン' })).toBeTruthy())
    expect(fetchAdminGames).not.toHaveBeenCalled()
  })

  it('権限がないとき、権限なしの案内が表示されデータ取得が行われないこと', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('other@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(false)
    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText(/権限がありません/)).toBeTruthy())
    expect(fetchAdminGames).not.toHaveBeenCalled()
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#ゲームの編集・削除-5、specs/board-game-rules/admin/requirements.md#通報の確認-8、specs/board-game-rules/admin/requirements.md#登録依頼の確認-12
describe('【管理画面】権限ありでモデレーションデータを取得して表示する', () => {
  it('権限があるとき、ゲーム一覧・通報一覧・登録依頼一覧が取得され表示されること', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchAdminGames).mockResolvedValue([makeGame()])

    render(<AdminPage />)

    await waitFor(() => expect(screen.getByText('カタン')).toBeTruthy())
    expect(fetchAdminGames).toHaveBeenCalled()
    expect(fetchReports).toHaveBeenCalled()
    expect(fetchGameRequests).toHaveBeenCalled()
  })

  it('データ取得に失敗した場合、エラー表示になり一覧は表示されないこと', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchAdminGames).mockRejectedValue(new Error('permission denied'))

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

// 仕様: specs/board-game-rules/admin/requirements.md#ゲームの編集・削除-6、specs/board-game-rules/admin/requirements.md#ゲームの編集・削除-7
describe('【管理画面】ゲームの編集・削除の操作が一覧に反映される', () => {
  it('一覧の編集を選ぶと編集フォームが表示されること', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchAdminGames).mockResolvedValue([makeGame()])

    render(<AdminPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: '編集' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '編集' }))

    expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy()
  })

  it('削除を確定すると、deleteGameが呼ばれ一覧が再取得されること', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchAdminGames).mockResolvedValue([makeGame()])

    render(<AdminPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: '削除' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '削除' }))
    fireEvent.click(screen.getByRole('button', { name: '削除を確定' }))

    await waitFor(() => expect(deleteGame).toHaveBeenCalledWith('game-1'))
    await waitFor(() => expect(fetchAdminGames).toHaveBeenCalledTimes(2))
  })
})

// 仕様: specs/board-game-rules/admin/requirements.md#登録依頼の確認-13、specs/board-game-rules/admin/requirements.md#登録依頼の確認-14
describe('【管理画面】登録依頼の処理済みマーク・削除の操作が一覧に反映される', () => {
  it('処理済みにするを押すと、markGameRequestProcessedが呼ばれ一覧が再取得されること', async () => {
    vi.mocked(getSession).mockResolvedValue(makeSession('admin@example.com'))
    vi.mocked(isAuthorizedAdmin).mockResolvedValue(true)
    vi.mocked(fetchGameRequests).mockResolvedValue([
      {
        id: 'req-1',
        photoPaths: [],
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
      },
    ])

    render(<AdminPage />)
    await waitFor(() => expect(screen.getByRole('button', { name: '処理済みにする' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '処理済みにする' }))

    await waitFor(() => expect(markGameRequestProcessed).toHaveBeenCalledWith('req-1'))
    await waitFor(() => expect(fetchGameRequests).toHaveBeenCalledTimes(2))
  })
})
