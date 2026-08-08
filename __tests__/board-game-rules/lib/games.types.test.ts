import { describe, it, expect } from 'vitest'
import { mapGameRowToGame, GAME_PUBLIC_COLUMNS, type GameRow } from '../../../app/board-game-rules/lib/games'

function makeRow(overrides: Partial<GameRow> = {}): GameRow {
  return {
    id: 'g1',
    name: 'カタン',
    min_players: 3,
    max_players: 4,
    min_minutes: 60,
    max_minutes: 90,
    genres: ['戦略', '協力'],
    min_age: 8,
    difficulty: '普通',
    publisher: 'GP',
    author: 'クラウス・トイバー',
    has_japanese_rules: true,
    awards: 'ドイツ年間ゲーム大賞',
    rules_simple: '資源を集めて開拓する。',
    rules_detailed: [
      { key: 'overview', body: '概要本文' },
      { key: 'setup', body: '' },
    ],
    release_year: 1995,
    created_at: '2026-08-07T00:00:00Z',
    ...overrides,
  }
}

// 仕様: specs/board-game-rules/game-registration/design.md#board_game_rules_games(変更)
describe('【共通】ゲーム型 - DB行(snake_case)を画面で扱う形(camelCase)へ変換する', () => {
  it('必須項目(名前・対応人数の下限上限・プレイ時間の下限上限)がそのまま引き継がれること', () => {
    const game = mapGameRowToGame(makeRow())
    expect(game.name).toBe('カタン')
    expect(game.minPlayers).toBe(3)
    expect(game.maxPlayers).toBe(4)
    expect(game.minMinutes).toBe(60)
    expect(game.maxMinutes).toBe(90)
  })

  it('任意項目(対象年齢・作者・受賞歴・言語依存度・発売年など)が未登録(NULL)のとき、nullとして保持されること', () => {
    const game = mapGameRowToGame(
      makeRow({
        min_age: null,
        difficulty: null,
        publisher: null,
        author: null,
        has_japanese_rules: null,
        awards: null,
        release_year: null,
      })
    )
    expect(game.minAge).toBeNull()
    expect(game.author).toBeNull()
    expect(game.awards).toBeNull()
    expect(game.hasJapaneseRules).toBeNull()
    expect(game.releaseYear).toBeNull()
  })

  it('発売年が登録済みのとき、そのまま引き継がれること', () => {
    const game = mapGameRowToGame(makeRow({ release_year: 1995 }))
    expect(game.releaseYear).toBe(1995)
  })

  it('ジャンルが複数登録されているとき、配列としてそのまま引き継がれること(複数選択可)', () => {
    const game = mapGameRowToGame(makeRow({ genres: ['協力', '対戦', 'カードゲーム'] }))
    expect(game.genres).toEqual(['協力', '対戦', 'カードゲーム'])
  })

  it('ジャンルが未選択(空配列)のとき、空配列のまま保持されること', () => {
    const game = mapGameRowToGame(makeRow({ genres: [] }))
    expect(game.genres).toEqual([])
  })

  it('詳しい版(共通章立ての配列)がそのまま章の配列として引き継がれ、空本文の章も保持されること', () => {
    const game = mapGameRowToGame(makeRow())
    expect(game.rulesDetailed).toEqual([
      { key: 'overview', body: '概要本文' },
      { key: 'setup', body: '' },
    ])
  })

  it('元写真パス(photo_paths)を含まないこと(一般には返さない項目)', () => {
    const game = mapGameRowToGame(makeRow())
    expect('photoPaths' in game).toBe(false)
    expect(Object.keys(game)).not.toContain('photo_paths')
  })
})

// 仕様: specs/board-game-rules/game-registration/requirements.md#写真の取り扱い-4
describe('【共通】一覧・詳細がSELECTする公開列 - 元写真パスを含めない', () => {
  it('公開列の指定に photo_paths が含まれないこと(列単位の秘匿を画面クエリ側でも守る)', () => {
    expect(GAME_PUBLIC_COLUMNS).not.toContain('photo_paths')
    expect(GAME_PUBLIC_COLUMNS).toContain('rules_detailed')
    expect(GAME_PUBLIC_COLUMNS).toContain('release_year')
    expect(GAME_PUBLIC_COLUMNS).toContain('genres')
  })
})
