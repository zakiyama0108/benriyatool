import { GENRES, type Genre } from './genres'
import type { Game } from './games'

// プレイ時間の希望帯(design.md「絞り込みの選択肢を用意する処理」手順3)。範囲型の
// min_minutes/max_minutesに対して「重なり」判定をするため、固定の代表的な帯を用意する
// (刻み値・区切りは実装時に決めてよい仕様のため、登録時の典型的なプレイ時間帯に合わせた)
export type PlaytimeBand = { label: string; minMinutes: number; maxMinutes: number }

// 対応人数の候補(design.md「絞り込みの選択肢を用意する処理」手順3)。「この人数で遊べる」を
// 1〜8人の代表値から選ぶ形にする(9人以上の対応ゲームは稀なため、まずはこの範囲で用意する)
export const PLAYER_COUNT_OPTIONS: number[] = [1, 2, 3, 4, 5, 6, 7, 8]

export const PLAYTIME_BAND_OPTIONS: PlaytimeBand[] = [
  { label: '30分以内', minMinutes: 0, maxMinutes: 30 },
  { label: '30〜60分', minMinutes: 30, maxMinutes: 60 },
  { label: '60〜90分', minMinutes: 60, maxMinutes: 90 },
  { label: '90〜120分', minMinutes: 90, maxMinutes: 120 },
  { label: '120分以上', minMinutes: 120, maxMinutes: Infinity },
]

// 一覧・絞り込み画面が持つ絞り込み条件(design.md「状態管理」)。各項目はnull/空文字/falseが
// 「未指定」を表す。ジャンル・難易度・メーカー・言語依存度・受賞歴はドロップダウンの単一選択、
// 作者のみテキスト検索(requirements.md#絞り込み-7)
export type GameFilters = {
  playerCount: number | null
  playtimeBand: PlaytimeBand | null
  genre: Genre | null
  minAge: number | null
  difficulty: string | null
  publisher: string | null
  hasJapaneseRules: boolean | null
  awardsOnly: boolean
  authorQuery: string
}

// 絞り込み条件の初期値(design.md「状態管理」: すべて未指定=全公開ゲームを表示)。
// リセット操作(requirements.md#絞り込み-8)もこの値へ戻す
export const EMPTY_FILTERS: GameFilters = {
  playerCount: null,
  playtimeBand: null,
  genre: null,
  minAge: null,
  difficulty: null,
  publisher: null,
  hasJapaneseRules: null,
  awardsOnly: false,
  authorQuery: '',
}

// 1件のゲームが現在の絞り込み条件をすべて満たすかを判定する(AND条件。requirements.md#絞り込み-6)。
// いずれの分類も、値が未登録(null/空文字)のゲームは、その分類で絞り込みを指定したときに
// 除外する(requirements.md#未入力項目の扱い-3)
function matchesFilters(game: Game, filters: GameFilters): boolean {
  // 対応人数: 指定した人数がゲームの対応人数の範囲(下限〜上限)に収まるか(境界値は含む)
  if (filters.playerCount != null) {
    if (filters.playerCount < game.minPlayers || filters.playerCount > game.maxPlayers) return false
  }

  // プレイ時間: 希望する時間帯とゲームのプレイ時間の範囲が重なるか(端が接する場合も重なりとみなす)
  if (filters.playtimeBand != null) {
    const { minMinutes, maxMinutes } = filters.playtimeBand
    if (minMinutes > game.maxMinutes || maxMinutes < game.minMinutes) return false
  }

  // ジャンル: 選んだジャンルがgenres配列に含まれるか(値の一致ではなく配列への包含判定)
  if (filters.genre != null) {
    if (!game.genres.includes(filters.genre)) return false
  }

  // 対象年齢: 指定年齢がmin_age以上か(境界値は含む)。min_age未登録は除外
  if (filters.minAge != null) {
    if (game.minAge == null || filters.minAge < game.minAge) return false
  }

  // 難易度・メーカー/出版社: 単一値の一致判定。未登録(null)は除外
  if (filters.difficulty != null && game.difficulty !== filters.difficulty) return false
  if (filters.publisher != null && game.publisher !== filters.publisher) return false

  // 言語依存度(日本語ルールの有無): 指定に一致するか。未登録(null)は除外
  if (filters.hasJapaneseRules != null && game.hasJapaneseRules !== filters.hasJapaneseRules) return false

  // 受賞歴: 「該当のみ」を指定した場合、受賞歴が登録されている(空でない)ゲームだけを残す
  if (filters.awardsOnly && !game.awards) return false

  // 作者(テキスト検索): 入力文字列が作者名に部分一致するか。未登録(null)は検索対象から外れる
  const authorQuery = filters.authorQuery.trim()
  if (authorQuery !== '') {
    if (!game.author || !game.author.includes(authorQuery)) return false
  }

  return true
}

// 取得済みのゲーム一覧へ絞り込み条件を適用する純粋関数(design.md「絞り込みを適用する処理」)。
// 再取得はせず、渡された配列に対してAND条件でフィルタするだけ
export function filterGames(games: Game[], filters: GameFilters): Game[] {
  return games.filter((game) => matchesFilters(game, filters))
}

// 選択式の分類の選択肢。ジャンル・難易度・メーカー・対象年齢は取得済みデータから、
// 対応人数・プレイ時間は固定の代表値(design.md「絞り込みの選択肢を用意する処理」)。
// 言語依存度・受賞歴は「あり/なし」「該当のみ」の固定選択肢のためFilterOptionsには含めない
// (FilterPanel側で固定の文言を直接出す)
export type FilterOptions = {
  genres: Genre[]
  difficulties: string[]
  publishers: string[]
  minAges: number[]
  playerCounts: number[]
  playtimeBands: PlaytimeBand[]
}

// 重複を除いた値を、初出順を保って返す(順序を安定させ、テストしやすくするため)
function uniqueInOrder<T>(values: T[]): T[] {
  return [...new Set(values)]
}

export function buildFilterOptions(games: Game[]): FilterOptions {
  // ジャンルは登録フォームと同じ並び(GENRES定義順)のうち、実際に使われている値だけを残す
  const usedGenres = new Set(games.flatMap((g) => g.genres))
  const genres = GENRES.map((g) => g.value).filter((genre) => usedGenres.has(genre))

  const difficulties = uniqueInOrder(games.map((g) => g.difficulty).filter((v): v is string => v != null))
  const publishers = uniqueInOrder(games.map((g) => g.publisher).filter((v): v is string => v != null))
  const minAges = uniqueInOrder(games.map((g) => g.minAge).filter((v): v is number => v != null)).sort(
    (a, b) => a - b
  )

  return {
    genres,
    difficulties,
    publishers,
    minAges,
    playerCounts: PLAYER_COUNT_OPTIONS,
    playtimeBands: PLAYTIME_BAND_OPTIONS,
  }
}
