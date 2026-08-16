import { describe, it, expect } from 'vitest'
import {
  filterGames,
  buildFilterOptions,
  EMPTY_FILTERS,
  PLAYER_COUNT_OPTIONS,
  PLAYTIME_BAND_OPTIONS,
  type GameFilters,
} from '../../../app/board-game-rules/lib/filterGames'
import type { Game } from '../../../app/board-game-rules/lib/games'

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    id: 'g1',
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
    awards: 'ドイツ年間ゲーム大賞',
    releaseYear: 1995,
    rulesSimple: '',
    rulesDetailed: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-6
describe('【絞り込み】対応人数 - 指定した人数が対応人数の下限〜上限の範囲に収まるゲームだけを残す', () => {
  it('下限・上限ちょうど(境界値)は範囲内として残ること', () => {
    const games = [makeGame({ id: 'g1', minPlayers: 3, maxPlayers: 4 })]
    expect(filterGames(games, { ...EMPTY_FILTERS, playerCount: 3 })).toHaveLength(1)
    expect(filterGames(games, { ...EMPTY_FILTERS, playerCount: 4 })).toHaveLength(1)
  })

  it('範囲外の人数は除外されること', () => {
    const games = [makeGame({ id: 'g1', minPlayers: 3, maxPlayers: 4 })]
    expect(filterGames(games, { ...EMPTY_FILTERS, playerCount: 2 })).toHaveLength(0)
    expect(filterGames(games, { ...EMPTY_FILTERS, playerCount: 5 })).toHaveLength(0)
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-6
describe('【絞り込み】プレイ時間 - 希望する時間帯とプレイ時間の下限〜上限が重なるゲームだけを残す', () => {
  it('時間帯とゲームの範囲が一部でも重なれば残ること(端が接する場合も重なりとみなす)', () => {
    const games = [makeGame({ id: 'g1', minMinutes: 90, maxMinutes: 120 })]
    const band = { label: '60〜90分', minMinutes: 60, maxMinutes: 90 }
    expect(filterGames(games, { ...EMPTY_FILTERS, playtimeBand: band })).toHaveLength(1)
  })

  it('時間帯とゲームの範囲が全く重ならない場合は除外されること', () => {
    const games = [makeGame({ id: 'g1', minMinutes: 90, maxMinutes: 120 })]
    const band = { label: '30分以内', minMinutes: 0, maxMinutes: 30 }
    expect(filterGames(games, { ...EMPTY_FILTERS, playtimeBand: band })).toHaveLength(0)
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-6
describe('【絞り込み】ジャンル - 1つ選ぶと、そのジャンルを含む(複数ジャンルを持つ)ゲームも対象になる', () => {
  it('複数ジャンルを持つゲームが、選んだジャンルを含んでいれば残ること', () => {
    const games = [makeGame({ id: 'g1', genres: ['協力', '対戦', 'カードゲーム'] })]
    expect(filterGames(games, { ...EMPTY_FILTERS, genre: '対戦' })).toHaveLength(1)
  })

  it('選んだジャンルを持たないゲームは除外されること', () => {
    const games = [makeGame({ id: 'g1', genres: ['協力'] })]
    expect(filterGames(games, { ...EMPTY_FILTERS, genre: '対戦' })).toHaveLength(0)
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-6、specs/board-game-rules/game-list/requirements.md#未入力項目の扱い-3
describe('【絞り込み】対象年齢 - 指定年齢がゲームの対象年齢(min_age)以上なら残る。境界値は含み、未登録は除外する', () => {
  it('指定年齢がmin_ageと等しい(境界値)場合は残ること', () => {
    const games = [makeGame({ id: 'g1', minAge: 8 })]
    expect(filterGames(games, { ...EMPTY_FILTERS, minAge: 8 })).toHaveLength(1)
  })

  it('指定年齢がmin_ageより大きい場合は残り、小さい場合は除外されること', () => {
    const games = [makeGame({ id: 'g1', minAge: 8 })]
    expect(filterGames(games, { ...EMPTY_FILTERS, minAge: 10 })).toHaveLength(1)
    expect(filterGames(games, { ...EMPTY_FILTERS, minAge: 6 })).toHaveLength(0)
  })

  it('対象年齢が未登録(null)のゲームは、この分類で絞り込みを指定すると除外されること', () => {
    const games = [makeGame({ id: 'g1', minAge: null })]
    expect(filterGames(games, { ...EMPTY_FILTERS, minAge: 8 })).toHaveLength(0)
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-6、specs/board-game-rules/game-list/requirements.md#未入力項目の扱い-3
describe('【絞り込み】難易度 - 指定した難易度に一致するゲームだけを残し、未登録は除外する', () => {
  it('一致するゲームは残り、一致しないゲームは除外されること', () => {
    const games = [makeGame({ id: 'g1', difficulty: '普通' }), makeGame({ id: 'g2', difficulty: '難しい' })]
    const result = filterGames(games, { ...EMPTY_FILTERS, difficulty: '普通' })
    expect(result.map((g) => g.id)).toEqual(['g1'])
  })

  it('難易度が未登録(null)のゲームは、この分類で絞り込みを指定すると除外されること', () => {
    const games = [makeGame({ id: 'g1', difficulty: null })]
    expect(filterGames(games, { ...EMPTY_FILTERS, difficulty: '普通' })).toHaveLength(0)
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-6、specs/board-game-rules/game-list/requirements.md#未入力項目の扱い-3
describe('【絞り込み】メーカー/出版社 - 指定したメーカーに一致するゲームだけを残し、未登録は除外する', () => {
  it('一致するゲームは残り、一致しないゲームは除外されること', () => {
    const games = [makeGame({ id: 'g1', publisher: 'GP' }), makeGame({ id: 'g2', publisher: 'HABA' })]
    const result = filterGames(games, { ...EMPTY_FILTERS, publisher: 'GP' })
    expect(result.map((g) => g.id)).toEqual(['g1'])
  })

  it('メーカーが未登録(null)のゲームは、この分類で絞り込みを指定すると除外されること', () => {
    const games = [makeGame({ id: 'g1', publisher: null })]
    expect(filterGames(games, { ...EMPTY_FILTERS, publisher: 'GP' })).toHaveLength(0)
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-6、specs/board-game-rules/game-list/requirements.md#未入力項目の扱い-3
describe('【絞り込み】言語依存度(日本語ルールの有無) - 指定に合うゲームだけを残し、未登録は除外する', () => {
  it('日本語ルールありを指定すると、ありのゲームだけが残ること', () => {
    const games = [makeGame({ id: 'g1', hasJapaneseRules: true }), makeGame({ id: 'g2', hasJapaneseRules: false })]
    const result = filterGames(games, { ...EMPTY_FILTERS, hasJapaneseRules: true })
    expect(result.map((g) => g.id)).toEqual(['g1'])
  })

  it('言語依存度が未登録(null)のゲームは、この分類で絞り込みを指定すると除外されること', () => {
    const games = [makeGame({ id: 'g1', hasJapaneseRules: null })]
    expect(filterGames(games, { ...EMPTY_FILTERS, hasJapaneseRules: true })).toHaveLength(0)
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-6、specs/board-game-rules/game-list/requirements.md#未入力項目の扱い-3
describe('【絞り込み】受賞歴 - 「受賞歴あり」を指定すると、受賞歴が登録されている(空でない)ゲームだけを残す', () => {
  it('受賞歴が登録されているゲームだけが残ること', () => {
    const games = [makeGame({ id: 'g1', awards: 'ドイツ年間ゲーム大賞' }), makeGame({ id: 'g2', awards: null })]
    const result = filterGames(games, { ...EMPTY_FILTERS, awardsOnly: true })
    expect(result.map((g) => g.id)).toEqual(['g1'])
  })

  it('受賞歴を指定しない場合は、未登録のゲームも含めすべて残ること', () => {
    const games = [makeGame({ id: 'g1', awards: 'ドイツ年間ゲーム大賞' }), makeGame({ id: 'g2', awards: null })]
    expect(filterGames(games, EMPTY_FILTERS)).toHaveLength(2)
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-7、specs/board-game-rules/game-list/requirements.md#未入力項目の扱い-3
describe('【絞り込み】作者のテキスト検索 - 入力した文字列が作者名に部分一致するゲームだけを残し、未登録は検索対象から外れる', () => {
  it('作者名の一部を入力すると、部分一致するゲームだけが残ること', () => {
    const games = [makeGame({ id: 'g1', author: 'クラウス・トイバー' }), makeGame({ id: 'g2', author: '宮本茂' })]
    const result = filterGames(games, { ...EMPTY_FILTERS, authorQuery: 'トイバー' })
    expect(result.map((g) => g.id)).toEqual(['g1'])
  })

  it('作者が未登録(null)のゲームは、作者テキスト検索を指定すると除外されること', () => {
    const games = [makeGame({ id: 'g1', author: null })]
    expect(filterGames(games, { ...EMPTY_FILTERS, authorQuery: 'トイバー' })).toHaveLength(0)
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-6
describe('【絞り込み】複数の分類を同時に指定した場合、すべての条件を満たすゲームに絞り込む(AND条件)', () => {
  it('対応人数とジャンルを両方指定すると、両方を満たすゲームだけが残ること', () => {
    const games = [
      makeGame({ id: 'g1', minPlayers: 2, maxPlayers: 4, genres: ['戦略'] }),
      makeGame({ id: 'g2', minPlayers: 2, maxPlayers: 4, genres: ['パーティー'] }),
      makeGame({ id: 'g3', minPlayers: 5, maxPlayers: 6, genres: ['戦略'] }),
    ]
    const result = filterGames(games, { ...EMPTY_FILTERS, playerCount: 3, genre: '戦略' })
    expect(result.map((g) => g.id)).toEqual(['g1'])
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#表示対象-2、specs/board-game-rules/game-list/design.md#絞り込みの選択肢を用意する処理
describe('【絞り込み】選択肢の組み立て - ジャンル・難易度・メーカー・対象年齢は登録データから、対応人数・プレイ時間は固定の代表値とする', () => {
  it('ジャンル・難易度・メーカー・対象年齢は、取得済みゲームが実際に持つ値だけが選択肢になり重複しないこと', () => {
    const games = [
      makeGame({ id: 'g1', genres: ['戦略', '協力'], difficulty: '普通', publisher: 'GP', minAge: 8 }),
      makeGame({ id: 'g2', genres: ['協力'], difficulty: '普通', publisher: 'HABA', minAge: 10 }),
    ]
    const options = buildFilterOptions(games)
    expect(new Set(options.genres)).toEqual(new Set(['戦略', '協力']))
    expect(options.difficulties).toEqual(['普通'])
    expect(new Set(options.publishers)).toEqual(new Set(['GP', 'HABA']))
    expect(options.minAges).toEqual([8, 10])
  })

  it('値を持つゲームが1件もない分類は、選択肢が空になること', () => {
    const games = [makeGame({ id: 'g1', difficulty: null, publisher: null, minAge: null })]
    const options = buildFilterOptions(games)
    expect(options.difficulties).toEqual([])
    expect(options.publishers).toEqual([])
    expect(options.minAges).toEqual([])
  })

  it('対応人数・プレイ時間の選択肢は、登録データの値によらず固定の代表値であること', () => {
    const options = buildFilterOptions([makeGame({ id: 'g1', minPlayers: 1, maxPlayers: 1, minMinutes: 5, maxMinutes: 5 })])
    expect(options.playerCounts).toEqual(PLAYER_COUNT_OPTIONS)
    expect(options.playtimeBands).toEqual(PLAYTIME_BAND_OPTIONS)
  })
})

// 仕様: specs/board-game-rules/game-list/requirements.md#絞り込み-8
describe('【絞り込み】初期条件(EMPTY_FILTERS) - すべて未指定であること(リセット時にこの状態へ戻す)', () => {
  it('EMPTY_FILTERSで絞り込むと、全ゲームがそのまま残ること', () => {
    const games = [makeGame({ id: 'g1' }), makeGame({ id: 'g2', minAge: null, difficulty: null })]
    expect(filterGames(games, EMPTY_FILTERS)).toHaveLength(2)
  })
})

// 型がexportされていることの確認(コンパイル時チェック用の最小限のランタイム検証)
describe('GameFilters型のエクスポート', () => {
  it('EMPTY_FILTERSがGameFilters型の形を満たすこと', () => {
    const filters: GameFilters = EMPTY_FILTERS
    expect(filters.playerCount).toBeNull()
  })
})
