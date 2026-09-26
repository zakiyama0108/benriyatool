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
  // 対応人数・プレイ時間はローカル生成(admin)が写真・Web検索で根拠が取れた場合のみ埋める方針のため、
  // 根拠が得られなければNULLのまま公開されうる(仕様: admin/requirements.md#登録実行のローカル処理起動-13)
  minPlayers: number | null
  maxPlayers: number | null
  minMinutes: number | null
  maxMinutes: number | null
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
  // ゲーム紹介画像(公開Storageバケット)のパス。順序付きで先頭がメイン画像
  // (仕様: game-registration/design.md「データベース設計」、game-list/design.md「メイン画像を表示する処理」)。
  // photo_paths(元写真、非公開)とは異なり公開列のためGame型に含める
  introPhotoPaths: string[]
  createdAt: string
}

// board_game_rules_games の行(一覧・詳細が必要とする列のみ。photo_pathsは選択しない)。
// supabase-js は snake_case のまま返すため、Row → Game の変換を挟む(ai-dev-digest/bookmarksと同じ方針)。
export type GameRow = {
  id: string
  name: string
  min_players: number | null
  max_players: number | null
  min_minutes: number | null
  max_minutes: number | null
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
  intro_photo_paths: string[]
  created_at: string
}

// 一覧・詳細が SELECT する公開列(photo_paths を含めない=必要列のみ)。
// この定数を各クエリで使い、photo_paths を誤って選択しないよう一元管理する
// (anon は列単位のSELECT権限から photo_paths が除外されており、含めると権限エラーになる)。
// intro_photo_paths(ゲーム紹介画像)はphoto_pathsと異なり公開列のため含める。
export const GAME_PUBLIC_COLUMNS =
  'id, name, min_players, max_players, min_minutes, max_minutes, genres, min_age, difficulty, publisher, author, has_japanese_rules, awards, release_year, rules_simple, rules_detailed, intro_photo_paths, created_at'

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
    introPhotoPaths: Array.isArray(row.intro_photo_paths) ? row.intro_photo_paths : [],
    createdAt: row.created_at,
  }
}

// 一覧・絞り込み(game-list)の対象になるゲームを、登録日時の新しい順に取得する
// (design.md「公開中のゲームを取得する処理」)。削除は物理削除に統一したため(adr/0001)、
// 存在する行はすべて公開対象で、deleted_atのような絞り込み条件は持たない(公開SELECTのRLSも
// using(true)。20260820140000マイグレーション)。件数が少ない前提で全件取得し、絞り込みは
// 取得済みデータへ画面側(lib/filterGames.ts)で適用する(再取得しない)。
// 取得に失敗した場合は呼び出し元(画面)がエラー表示できるよう例外を投げる。
export async function fetchPublishedGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('board_game_rules_games')
    .select(GAME_PUBLIC_COLUMNS)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`ゲーム一覧の取得に失敗しました: ${error.message}`)
  return ((data ?? []) as GameRow[]).map(mapGameRowToGame)
}

// 単一ゲーム取得の結果(game-detail/design.md「対象ゲームを取得して表示する処理」)。
// 「該当なし(存在しない/削除済み)」と「取得失敗」は画面で出し分けるため区別して返す。
export type FetchGameResult =
  | { status: 'found'; game: Game }
  | { status: 'notFound' }
  | { status: 'error' }

// UUID形式の簡易判定。詳細画面のクエリIDは、DBへ渡す前に形式を検証し、
// 不正な文字列はそのまま「見つかりません」で終える(design.md#セキュリティ。SQLへ文字列を埋め込まない)。
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// 指定IDの公開ゲームを1件取得する(game-detail/design.md「対象ゲームを取得して表示する処理」)。
// photo_paths(元写真)は含めず、intro_photo_paths(公開)は含める(GAME_PUBLIC_COLUMNS)。
// 削除は物理削除のため、削除済みは行が存在せずnotFoundになる(deleted_atでの絞り込みはしない)。
// 不正なID形式・該当なしはnotFound、想定外の取得失敗はerrorを返す(呼び出し元が再試行手段を出せる)。
export async function fetchGameById(id: string): Promise<FetchGameResult> {
  if (!id || !UUID_RE.test(id)) return { status: 'notFound' }
  const { data, error } = await supabase
    .from('board_game_rules_games')
    .select(GAME_PUBLIC_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)。ゲーム情報の中身は出さない
    console.error('ゲーム詳細の取得に失敗しました', { id })
    return { status: 'error' }
  }
  if (!data) return { status: 'notFound' }
  return { status: 'found', game: mapGameRowToGame(data) }
}
