import { supabase } from '../../../lib/supabaseClient'
import type { Genre } from '../../lib/genres'

export type GameRequest = {
  id: string
  photoPaths: string[]
  // ゲーム紹介画像(公開Storage)のパス。順序付きで先頭がメイン画像候補。0枚(自動補完対象)〜20枚
  // (仕様: admin/requirements.md#ゲーム紹介画像の確認・自動補完-11)
  introPhotoPaths: string[]
  name: string | null
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
  createdAt: string
  processedAt: string | null
}

type GameRequestRow = {
  id: string
  photo_paths: string[]
  intro_photo_paths: string[]
  name: string | null
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
  created_at: string
  processed_at: string | null
}

function mapRow(row: GameRequestRow): GameRequest {
  return {
    id: row.id,
    photoPaths: row.photo_paths,
    introPhotoPaths: Array.isArray(row.intro_photo_paths) ? row.intro_photo_paths : [],
    name: row.name,
    minPlayers: row.min_players,
    maxPlayers: row.max_players,
    minMinutes: row.min_minutes,
    maxMinutes: row.max_minutes,
    genres: row.genres as Genre[],
    minAge: row.min_age,
    difficulty: row.difficulty,
    publisher: row.publisher,
    author: row.author,
    hasJapaneseRules: row.has_japanese_rules,
    awards: row.awards,
    releaseYear: row.release_year,
    createdAt: row.created_at,
    processedAt: row.processed_at,
  }
}

// 登録依頼を未処理優先・次いで新しい順に取得する(仕様: admin/design.md「登録依頼を確認する処理」)。
// 取得に失敗した場合は例外を投げ、呼び出し元(画面)でエラー表示に切り替える
export async function fetchGameRequests(): Promise<GameRequest[]> {
  const { data, error } = await supabase
    .from('board_game_rules_game_requests')
    .select('*')
    .order('processed_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false })
  if (error) {
    throw new Error(`登録依頼一覧の取得に失敗しました: ${error.message}`)
  }
  return ((data ?? []) as GameRequestRow[]).map(mapRow)
}

// 外部ツールでの登録が完了した依頼を処理済みにする(仕様: admin/design.md「登録依頼を処理済みにする処理」)
export async function markGameRequestProcessed(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('board_game_rules_game_requests')
      .update({ processed_at: new Date().toISOString() })
      .eq('id', id)
    return !error
  } catch {
    return false
  }
}

// 不要な登録依頼(スパム・重複・情報不足など)を削除する(仕様: admin/design.md「削除する処理」)
export async function deleteGameRequest(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('board_game_rules_game_requests').delete().eq('id', id)
    return !error
  } catch {
    return false
  }
}
