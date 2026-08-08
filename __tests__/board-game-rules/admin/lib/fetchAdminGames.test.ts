import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('../../../../app/lib/supabaseClient', () => ({ supabase: { from: fromMock } }))

import { fetchAdminGames } from '../../../../app/board-game-rules/admin/lib/fetchAdminGames'

type GamesResult = { data: unknown; error: unknown }
type ReportsResult = { data: unknown; error: unknown }

function setup(gamesResult: GamesResult, reportsResult: ReportsResult) {
  fromMock.mockImplementation((table: string) => {
    if (table === 'board_game_rules_games') {
      return { select: () => Promise.resolve(gamesResult) }
    }
    if (table === 'board_game_rules_reports') {
      return { select: () => Promise.resolve(reportsResult) }
    }
    throw new Error(`unexpected table: ${table}`)
  })
}

function makeRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'game-1',
    name: 'カタン',
    min_players: 3,
    max_players: 4,
    min_minutes: 60,
    max_minutes: 90,
    genres: ['対戦'],
    min_age: null,
    difficulty: null,
    publisher: null,
    author: null,
    has_japanese_rules: null,
    awards: null,
    release_year: null,
    rules_simple: '',
    rules_detailed: [],
    photo_paths: ['req-1/0.jpg'],
    created_at: '2026-08-01T00:00:00.000Z',
    deleted_at: null,
    ...overrides,
  }
}

beforeEach(() => {
  fromMock.mockReset()
})

// 仕様: specs/board-game-rules/admin/requirements.md#ゲームの編集・削除-5、specs/board-game-rules/admin/design.md#ゲーム一覧を取得する処理(モデレーション対象)
describe('【管理画面】モデレーション対象のゲーム一覧を取得する - 対応が必要なものを見つけやすい順に並べる', () => {
  it('通報件数の多い順に並ぶこと', async () => {
    setup(
      {
        data: [
          makeRow({ id: 'game-1', created_at: '2026-08-01T00:00:00.000Z' }),
          makeRow({ id: 'game-2', created_at: '2026-08-02T00:00:00.000Z' }),
        ],
        error: null,
      },
      { data: [{ game_id: 'game-1' }, { game_id: 'game-2' }, { game_id: 'game-2' }], error: null }
    )

    const games = await fetchAdminGames()

    expect(games.map((g) => g.id)).toEqual(['game-2', 'game-1'])
    expect(games[0].reportCount).toBe(2)
    expect(games[1].reportCount).toBe(1)
  })

  it('通報件数が同じ場合、新しい順に並ぶこと', async () => {
    setup(
      {
        data: [
          makeRow({ id: 'game-old', created_at: '2026-08-01T00:00:00.000Z' }),
          makeRow({ id: 'game-new', created_at: '2026-08-02T00:00:00.000Z' }),
        ],
        error: null,
      },
      { data: [], error: null }
    )

    const games = await fetchAdminGames()

    expect(games.map((g) => g.id)).toEqual(['game-new', 'game-old'])
  })

  it('通報が0件のゲームも一覧に含まれ、reportCountが0になること', async () => {
    setup({ data: [makeRow({ id: 'game-1' })], error: null }, { data: [], error: null })

    const games = await fetchAdminGames()

    expect(games[0].reportCount).toBe(0)
  })

  it('削除済み(deleted_atあり)のゲームも一覧に含まれ、deletedAtが判定できること', async () => {
    setup(
      { data: [makeRow({ id: 'game-1', deleted_at: '2026-08-03T00:00:00.000Z' })], error: null },
      { data: [], error: null }
    )

    const games = await fetchAdminGames()

    expect(games[0].deletedAt).toBe('2026-08-03T00:00:00.000Z')
  })

  it('元写真照合に使うphotoPathsを含めて返すこと', async () => {
    setup({ data: [makeRow({ photo_paths: ['a/0.jpg', 'a/1.jpg'] })], error: null }, { data: [], error: null })

    const games = await fetchAdminGames()

    expect(games[0].photoPaths).toEqual(['a/0.jpg', 'a/1.jpg'])
  })

  it('ゲーム一覧の取得に失敗した場合、例外を投げて呼び出し元(画面)でエラー表示できるようにすること', async () => {
    setup({ data: null, error: { message: 'permission denied' } }, { data: [], error: null })

    await expect(fetchAdminGames()).rejects.toThrow()
  })

  it('通報件数の取得に失敗した場合も、例外を投げること', async () => {
    setup({ data: [], error: null }, { data: null, error: { message: 'permission denied' } })

    await expect(fetchAdminGames()).rejects.toThrow()
  })
})
