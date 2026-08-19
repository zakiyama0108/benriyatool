import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('../../../app/lib/supabaseClient', () => ({ supabase: { from: fromMock } }))

import { fetchPublishedGames } from '../../../app/board-game-rules/lib/games'

type QueryResult = { data: unknown; error: unknown }

// board_game_rules_games への select().is().order() クエリをモックする
// (admin/lib/fetchAdminGames.test.tsと同じ「テーブル名で出し分ける」方針)
function setupFrom(result: QueryResult) {
  const orderMock = vi.fn().mockResolvedValue(result)
  const isMock = vi.fn().mockReturnValue({ order: orderMock })
  const selectMock = vi.fn().mockReturnValue({ is: isMock })
  fromMock.mockImplementation((table: string) => {
    if (table === 'board_game_rules_games') return { select: selectMock }
    throw new Error(`unexpected table: ${table}`)
  })
  return { selectMock, isMock, orderMock }
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
    intro_photo_paths: [],
    created_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  fromMock.mockReset()
})

// 仕様: specs/board-game-rules/game-list/requirements.md#表示対象-1
describe('【一覧・絞り込み】公開中ゲームの取得 - 削除されていない(deleted_at is null)ゲームのみを対象にする', () => {
  it('board_game_rules_gamesに対し、deleted_at is nullで絞り込むクエリを発行すること', async () => {
    const { isMock } = setupFrom({ data: [makeRow()], error: null })

    await fetchPublishedGames()

    expect(fromMock).toHaveBeenCalledWith('board_game_rules_games')
    expect(isMock).toHaveBeenCalledWith('deleted_at', null)
  })
})

// 仕様: specs/board-game-rules/game-list/design.md#公開中のゲームを取得する処理
describe('【一覧・絞り込み】公開中ゲームの取得 - 並び順・選択列・取得失敗時の扱い', () => {
  it('登録日時(created_at)の新しい順で取得すること', async () => {
    const { orderMock } = setupFrom({ data: [makeRow()], error: null })

    await fetchPublishedGames()

    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: false })
  })

  it('元写真パス(photo_paths)を選択列に含めないこと', async () => {
    const { selectMock } = setupFrom({ data: [makeRow()], error: null })

    await fetchPublishedGames()

    const selectedColumns = selectMock.mock.calls[0][0] as string
    // intro_photo_paths(公開列)は"photo_paths"を部分文字列として含むため、列名の完全一致で判定する
    expect(selectedColumns.split(', ')).not.toContain('photo_paths')
    expect(selectedColumns).toContain('genres')
  })

  it('取得したデータがGame型(camelCase)へ変換されて返ること', async () => {
    setupFrom({ data: [makeRow({ id: 'game-2', name: 'ドミニオン' })], error: null })

    const games = await fetchPublishedGames()

    expect(games).toEqual([expect.objectContaining({ id: 'game-2', name: 'ドミニオン' })])
  })

  it('取得に失敗した場合、呼び出し元がエラー表示できるよう例外を投げること', async () => {
    setupFrom({ data: null, error: { message: 'permission denied' } })

    await expect(fetchPublishedGames()).rejects.toThrow()
  })
})

// 仕様: specs/board-game-rules/game-list/design.md#公開中のゲームを取得する処理
describe('【一覧・絞り込み】公開中ゲームの取得 - ゲーム紹介画像の並び順配列(intro_photo_paths)を含める', () => {
  it('選択列にintro_photo_pathsを含めること(サムネイル表示に使うため)', async () => {
    const { selectMock } = setupFrom({ data: [makeRow()], error: null })

    await fetchPublishedGames()

    const selectedColumns = selectMock.mock.calls[0][0] as string
    expect(selectedColumns).toContain('intro_photo_paths')
  })

  it('取得したintro_photo_pathsがintroPhotoPaths(camelCase)として変換されて返ること', async () => {
    setupFrom({ data: [makeRow({ intro_photo_paths: ['game-2/0.jpg', 'game-2/1.jpg'] })], error: null })

    const games = await fetchPublishedGames()

    expect(games[0].introPhotoPaths).toEqual(['game-2/0.jpg', 'game-2/1.jpg'])
  })
})
