import { supabase } from '../../lib/supabaseClient'
import type { ChapterKey } from './rulesChapters'
import type { Genre } from './genres'

// 詳しい版の1章。共通章立てのキーと本文(空文字もありうる=該当ルールがないゲーム)。
export type RuleChapter = { key: ChapterKey; body: string }

// 公開ゲーム(一覧・詳細・お気に入り対象が読む形。仕様: game-registration/design.md「データベース設計」)。
// 元写真パス(photo_paths)は含めない=一般には返さない(列単位の秘匿はDB側でも担保)。
// 2026-08の見直しで運営者登録タグ(is_official)を撤廃し、発売年(releaseYear)を追加、
// ジャンルを単一選択(genre)から複数選択(genres)に変更した
// (docs/adr/0007「2026-08の見直し」参照。全ゲームが運営者経由で登録される前提になったため)。
export type Game = {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  minMinutes: number
  maxMinutes: number
  genres: Genre[]
  minAge: number | null
  difficulty: string | null
  publisher: string | null
  author: string | null
  hasJapaneseRules: boolean | null
  awards: string | null
  releaseYear: number | null
  rulesSimple: string
  rulesDetailed: RuleChapter[]
  createdAt: string
}

// board_game_rules_games の行(一覧・詳細が必要とする列のみ。photo_pathsは選択しない)。
// supabase-js は snake_case のまま返すため、Row → Game の変換を挟む(ai-dev-digest/bookmarksと同じ方針)。
export type GameRow = {
  id: string
  name: string
  min_players: number
  max_players: number
  min_minutes: number
  max_minutes: number
  genres: string[]
  min_age: number | null
  difficulty: string | null
  publisher: string | null
  author: string | null
  has_japanese_rules: boolean | null
  awards: string | null
  release_year: number | null
  rules_simple: string
  rules_detailed: RuleChapter[]
  created_at: string
}

// 一覧・詳細が SELECT する公開列(photo_paths を含めない=必要列のみ)。
// この定数を各クエリで使い、photo_paths を誤って選択しないよう一元管理する
// (anon は列単位のSELECT権限から photo_paths が除外されており、含めると権限エラーになる)。
export const GAME_PUBLIC_COLUMNS =
  'id, name, min_players, max_players, min_minutes, max_minutes, genres, min_age, difficulty, publisher, author, has_japanese_rules, awards, release_year, rules_simple, rules_detailed, created_at'

// DB行(snake_case)を画面で扱うGame(camelCase)へ変換する。
// rules_detailed(jsonb)は共通章立ての配列としてそのまま扱う(想定外の値は空配列に倒す)。
export function mapGameRowToGame(row: GameRow): Game {
  return {
    id: row.id,
    name: row.name,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    minMinutes: row.min_minutes,
    maxMinutes: row.max_minutes,
    genres: Array.isArray(row.genres) ? (row.genres as Genre[]) : [],
    minAge: row.min_age,
    difficulty: row.difficulty,
    publisher: row.publisher,
    author: row.author,
    hasJapaneseRules: row.has_japanese_rules,
    awards: row.awards,
    releaseYear: row.release_year,
    rulesSimple: row.rules_simple,
    rulesDetailed: Array.isArray(row.rules_detailed) ? row.rules_detailed : [],
    createdAt: row.created_at,
  }
}

// 一覧・絞り込み(game-list)の対象になる公開中ゲームを、登録日時の新しい順に取得する
// (design.md「公開中のゲームを取得する処理」)。deleted_at is nullで明示的に絞り込む
// (RLS「anyone can select published games」でも同条件が担保されるが、クライアント側の
// クエリでも同じ条件を持たせ、意図を自己文書化する)。件数が少ない前提で全件取得し、
// 絞り込みは取得済みデータへ画面側(lib/filterGames.ts)で適用する(再取得しない)。
// 取得に失敗した場合は呼び出し元(画面)がエラー表示できるよう例外を投げる。
export async function fetchPublishedGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('board_game_rules_games')
    .select(GAME_PUBLIC_COLUMNS)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`ゲーム一覧の取得に失敗しました: ${error.message}`)
  return ((data ?? []) as GameRow[]).map(mapGameRowToGame)
}
