import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fromMock, getUserMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  getUserMock: vi.fn(),
}))
vi.mock('../../../app/lib/supabaseClient', () => ({
  supabase: { from: fromMock, auth: { getUser: getUserMock } },
}))

import { fetchMyFavoriteGameIds, fetchMyFavoriteGames, addFavorite, removeFavorite } from '../../../app/board-game-rules/lib/favorites'

// board_game_rules_games の公開列(id, name等)を最小限持つ行を作る
function makeGameRow(overrides: Record<string, unknown> = {}) {
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
    created_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

type QueryResult = { data: unknown; error: unknown }

// board_game_rules_favorites / board_game_rules_games へのクエリをテーブル名・列名で
// 出し分けるモック(admin/fetchAdminGames.test.tsと同じ方針)。
// insert/delete系は別途モックを注入できるようにする
function setupFrom(options: {
  idsResult?: QueryResult
  favoritesResult?: QueryResult
  gamesResult?: QueryResult
  insertMock?: ReturnType<typeof vi.fn>
  deleteEqMock?: ReturnType<typeof vi.fn>
}) {
  const insertMock = options.insertMock ?? vi.fn().mockResolvedValue({ data: null, error: null })
  const deleteEqMock = options.deleteEqMock ?? vi.fn().mockResolvedValue({ data: null, error: null })

  fromMock.mockImplementation((table: string) => {
    if (table === 'board_game_rules_favorites') {
      return {
        select: (columns: string) => {
          if (columns === 'game_id') return Promise.resolve(options.idsResult)
          return { order: () => Promise.resolve(options.favoritesResult) }
        },
        insert: insertMock,
        delete: () => ({ eq: deleteEqMock }),
      }
    }
    if (table === 'board_game_rules_games') {
      return { select: () => ({ in: () => Promise.resolve(options.gamesResult) }) }
    }
    throw new Error(`unexpected table: ${table}`)
  })

  return { insertMock, deleteEqMock }
}

beforeEach(() => {
  fromMock.mockReset()
  getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入りの登録・解除-3
describe('画面内の自分のお気に入りgame_id集合の取得 - 一覧・詳細ごとに個別取得せず1回でまとめて取得する', () => {
  it('取得したお気に入り行のgame_idがSetとして返ること', async () => {
    setupFrom({ idsResult: { data: [{ game_id: 'game-1' }, { game_id: 'game-2' }], error: null } })

    const result = await fetchMyFavoriteGameIds()

    expect(fromMock).toHaveBeenCalledWith('board_game_rules_favorites')
    expect(result).toEqual(new Set(['game-1', 'game-2']))
  })

  it('取得に失敗した場合、呼び出し元が「すべて未登録」として扱えるよう例外を投げること', async () => {
    setupFrom({ idsResult: { data: null, error: { message: 'network error' } } })

    await expect(fetchMyFavoriteGameIds()).rejects.toThrow()
  })
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入り一覧-4、specs/board-game-rules/favorite/requirements.md#お気に入り一覧-7
describe('お気に入りゲーム一覧の取得 - 登録日時の新しい順に、公開中のゲーム情報とあわせて取得する', () => {
  it('お気に入り行の登録日時(created_at)降順のまま、対象ゲームの情報(Game型)に変換されて返ること', async () => {
    setupFrom({
      favoritesResult: {
        data: [
          { id: 'fav-2', game_id: 'game-2', created_at: '2026-08-02T00:00:00.000Z' },
          { id: 'fav-1', game_id: 'game-1', created_at: '2026-08-01T00:00:00.000Z' },
        ],
        error: null,
      },
      gamesResult: {
        data: [makeGameRow({ id: 'game-1', name: 'カタン' }), makeGameRow({ id: 'game-2', name: 'ドミニオン' })],
        error: null,
      },
    })

    const result = await fetchMyFavoriteGames()

    expect(result.map((f) => f.game.name)).toEqual(['ドミニオン', 'カタン'])
    expect(result[0].favoriteId).toBe('fav-2')
    expect(result[0].favoritedAt).toBe('2026-08-02T00:00:00.000Z')
    expect(result[0].game.id).toBe('game-2')
  })

  it('お気に入り行はあるが対象ゲームが削除済み等で取得できない場合、その項目は一覧から除外されること(存在しない詳細へのリンクを作らないため)', async () => {
    setupFrom({
      favoritesResult: {
        data: [
          { id: 'fav-2', game_id: 'game-deleted', created_at: '2026-08-02T00:00:00.000Z' },
          { id: 'fav-1', game_id: 'game-1', created_at: '2026-08-01T00:00:00.000Z' },
        ],
        error: null,
      },
      // 削除済みゲームはRLS(deleted_at is null)で返らないため、game-1のみ返る想定
      gamesResult: { data: [makeGameRow({ id: 'game-1' })], error: null },
    })

    const result = await fetchMyFavoriteGames()

    expect(result.map((f) => f.game.id)).toEqual(['game-1'])
  })

  it('お気に入りが0件の場合、ゲームの取得は行わず空配列が返ること', async () => {
    setupFrom({ favoritesResult: { data: [], error: null } })

    const result = await fetchMyFavoriteGames()

    expect(result).toEqual([])
  })

  it('お気に入り行の取得に失敗した場合、呼び出し元が「0件」として扱えるよう例外を投げること', async () => {
    setupFrom({ favoritesResult: { data: null, error: { message: 'network error' } } })

    await expect(fetchMyFavoriteGames()).rejects.toThrow()
  })

  it('対象ゲームの取得に失敗した場合も、呼び出し元が「0件」として扱えるよう例外を投げること', async () => {
    setupFrom({
      favoritesResult: { data: [{ id: 'fav-1', game_id: 'game-1', created_at: '2026-08-01T00:00:00.000Z' }], error: null },
      gamesResult: { data: null, error: { message: 'network error' } },
    })

    await expect(fetchMyFavoriteGames()).rejects.toThrow()
  })
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入りの登録・解除-1
describe('お気に入りの登録 - ログイン中の本人のuser_idで対象ゲームを新規登録する', () => {
  it('登録に成功した場合、trueが返り、ログイン中の本人のuser_idと対象game_idでINSERTされること', async () => {
    const { insertMock } = setupFrom({})

    const result = await addFavorite('game-1')

    expect(insertMock).toHaveBeenCalledWith({ user_id: 'user-1', game_id: 'game-1' })
    expect(result).toBe(true)
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    setupFrom({ insertMock: vi.fn().mockResolvedValue({ data: null, error: { message: 'duplicate key' } }) })

    await expect(addFavorite('game-1')).resolves.toBe(false)
  })

  it('登録処理が例外を投げた場合も、falseで正常終了すること', async () => {
    setupFrom({
      insertMock: vi.fn(() => {
        throw new Error('network error')
      }),
    })

    await expect(addFavorite('game-1')).resolves.toBe(false)
  })
})

// 仕様: specs/board-game-rules/favorite/requirements.md#お気に入りの登録・解除-1
describe('お気に入りの解除 - 対象ゲームのお気に入り行を削除する', () => {
  it('解除に成功した場合、trueが返り、対象game_idで削除されること(本人の行のみRLSで対象になる)', async () => {
    const { deleteEqMock } = setupFrom({})

    const result = await removeFavorite('game-1')

    expect(deleteEqMock).toHaveBeenCalledWith('game_id', 'game-1')
    expect(result).toBe(true)
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    setupFrom({ deleteEqMock: vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } }) })

    await expect(removeFavorite('game-1')).resolves.toBe(false)
  })

  it('解除処理が例外を投げた場合も、falseで正常終了すること', async () => {
    setupFrom({
      deleteEqMock: vi.fn(() => {
        throw new Error('network error')
      }),
    })

    await expect(removeFavorite('game-1')).resolves.toBe(false)
  })
})
