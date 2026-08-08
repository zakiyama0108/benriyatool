import { supabase } from '../../../lib/supabaseClient'
import type { RuleChapter } from '../../lib/games'
import type { Genre } from '../../lib/genres'

export type GameEditInput = {
  id: string
  name: string
  minPlayers: number
  maxPlayers: number
  minMinutes: number
  maxMinutes: number
  genres: Genre[]
  minAge?: number
  difficulty?: string
  publisher?: string
  author?: string
  hasJapaneseRules?: boolean
  awards?: string
  releaseYear?: number
  rulesSimple: string
  rulesDetailed: RuleChapter[]
}

// board_game_rules_games のCHECK制約(game-registration/design.md「データベース設計」)と揃えた検証。
// 唯一のWeb側書き込み経路(編集)のため、DBのCHECKに反する更新を送らないようここで先に弾く
function isValidGameEdit(input: GameEditInput): boolean {
  if (input.name.trim() === '') return false
  if (input.minPlayers > input.maxPlayers) return false
  if (input.minMinutes > input.maxMinutes) return false
  if (input.rulesSimple.length > 4000) return false
  if (JSON.stringify(input.rulesDetailed).length > 40000) return false
  return true
}

// ゲームの分類情報・ルール本文を編集して上書き保存する(仕様: admin/design.md「ゲームを編集して上書き保存する処理」)。
// 登録時(game-registration)と同じ検証を通してから運営者本人としてUPDATEする(RLSで担保)。
export async function editGame(input: GameEditInput): Promise<boolean> {
  if (!isValidGameEdit(input)) return false

  try {
    const { error } = await supabase
      .from('board_game_rules_games')
      .update({
        name: input.name,
        min_players: input.minPlayers,
        max_players: input.maxPlayers,
        min_minutes: input.minMinutes,
        max_minutes: input.maxMinutes,
        genres: input.genres,
        min_age: input.minAge ?? null,
        difficulty: input.difficulty ?? null,
        publisher: input.publisher ?? null,
        author: input.author ?? null,
        has_japanese_rules: input.hasJapaneseRules ?? null,
        awards: input.awards ?? null,
        release_year: input.releaseYear ?? null,
        rules_simple: input.rulesSimple,
        rules_detailed: input.rulesDetailed,
      })
      .eq('id', input.id)
    return !error
  } catch {
    return false
  }
}

// ゲームを論理削除する(deleted_atに現在時刻をセット。仕様: admin/design.md「ゲームを削除する処理」)。
// 一覧・詳細・絞り込みの対象から外れるが、通報・元写真の照合は引き続き行える
export async function deleteGame(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('board_game_rules_games')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
    return !error
  } catch {
    return false
  }
}

// 不適切なコメントを削除する(仕様: admin/requirements.md#コメントの削除-11)。
// comment specの実装が別途進むまでは、共通のdeleteCommentを再利用せずここで直接DELETEする
export async function deleteComment(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('board_game_rules_comments').delete().eq('id', id)
    return !error
  } catch {
    return false
  }
}
