import { describe, it, expect, vi, beforeEach } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('../../../app/lib/supabaseClient', () => ({ supabase: { from: fromMock } }))

import { fetchPublishedGames, fetchGameById } from '../../../app/board-game-rules/lib/games'

type QueryResult = { data: unknown; error: unknown }

// board_game_rules_games への select().order() クエリをモックする
// (物理削除に統一したため deleted_at 絞り込み(.is())は持たない)。
function setupFrom(result: QueryResult) {
  const orderMock = vi.fn().mockResolvedValue(result)
  const selectMock = vi.fn().mockReturnValue({ order: orderMock })
  fromMock.mockImplementation((table: string) => {
    if (table === 'board_game_rules_games') return { select: selectMock }
    throw new Error(`unexpected table: ${table}`)
  })
  return { selectMock, orderMock }
}

// 単一ゲーム取得(fetchGameById)用のモック。select().eq('id', ...).maybeSingle() の形。
function setupFromById(result: QueryResult) {
  const maybeSingleMock = vi.fn().mockResolvedValue(result)
  const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock })
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock })
  fromMock.mockImplementation((table: string) => {
    if (table === 'board_game_rules_games') return { select: selectMock }
    throw new Error(`unexpected table: ${table}`)
  })
  return { selectMock, eqMock, maybeSingleMock }
}

// 実在しそうなUUID(fetchGameByIdはUUID形式のみ問い合わせる)
const VALID_UUID = '11111111-1111-4111-8111-111111111111'

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
describe('【一覧・絞り込み】公開中ゲームの取得 - 存在する全ゲームを対象にする(物理削除に統一)', () => {
  it('board_game_rules_gamesを対象に取得し、deleted_atのような論理削除の絞り込みを行わないこと', async () => {
    const { selectMock } = setupFrom({ data: [makeRow()], error: null })

    await fetchPublishedGames()

    expect(fromMock).toHaveBeenCalledWith('board_game_rules_games')
    // 物理削除に統一したため、選択列にもクエリにも deleted_at は現れない
    const selectedColumns = selectMock.mock.calls[0][0] as string
    expect(selectedColumns).not.toContain('deleted_at')
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

// 仕様: specs/board-game-rules/game-detail/requirements.md#基本情報の表示-1、specs/board-game-rules/game-detail/requirements.md#表示対象-2
describe('【詳細】単一ゲームの取得 - 指定IDのゲームを、元写真パスを含めず紹介画像を含めて取得する', () => {
  it('取得できた場合、found状態でGame型(intro_photo_pathsを含む)が返り、選択列にphoto_pathsを含めないこと', async () => {
    const { selectMock } = setupFromById({
      data: makeRow({ id: VALID_UUID, name: 'カタン', intro_photo_paths: ['g/0.jpg'] }),
      error: null,
    })

    const result = await fetchGameById(VALID_UUID)

    expect(result).toEqual({ status: 'found', game: expect.objectContaining({ id: VALID_UUID, name: 'カタン' }) })
    const selectedColumns = selectMock.mock.calls[0][0] as string
    expect(selectedColumns.split(', ')).not.toContain('photo_paths')
    expect(selectedColumns).toContain('intro_photo_paths')
  })

  it('該当ゲームが存在しない(削除済みを含む)場合、notFound状態が返ること', async () => {
    setupFromById({ data: null, error: null })

    const result = await fetchGameById(VALID_UUID)

    expect(result).toEqual({ status: 'notFound' })
  })

  it('取得に失敗した場合、notFoundと区別できるerror状態が返ること', async () => {
    setupFromById({ data: null, error: { message: 'network error' } })

    const result = await fetchGameById(VALID_UUID)

    expect(result).toEqual({ status: 'error' })
  })

  it('不正なID形式(UUIDでない)の場合は、問い合わせをせずnotFound扱いになること', async () => {
    const { selectMock } = setupFromById({ data: makeRow(), error: null })

    const result = await fetchGameById('not-a-uuid')

    expect(result).toEqual({ status: 'notFound' })
    expect(selectMock).not.toHaveBeenCalled()
  })

  it('IDが空の場合も、問い合わせをせずnotFound扱いになること', async () => {
    const { selectMock } = setupFromById({ data: makeRow(), error: null })

    const result = await fetchGameById('')

    expect(result).toEqual({ status: 'notFound' })
    expect(selectMock).not.toHaveBeenCalled()
  })
})
