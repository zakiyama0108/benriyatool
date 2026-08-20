import { supabase } from '../../lib/supabaseClient'
import type { RuleChapter } from './games'
import type { Genre } from './genres'

// 運営者がゲーム詳細画面から行う編集の入力(仕様: game-detail/design.md「ゲームを編集して上書き保存する処理」)。
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
// 唯一のWeb側書き込み経路(運営者編集)のため、DBのCHECKに反する更新を送らないようここで先に弾く。
function isValidGameEdit(input: GameEditInput): boolean {
  if (input.name.trim() === '') return false
  if (input.minPlayers > input.maxPlayers) return false
  if (input.minMinutes > input.maxMinutes) return false
  if (input.rulesSimple.length > 4000) return false
  if (JSON.stringify(input.rulesDetailed).length > 40000) return false
  return true
}

// ゲームの分類情報・ルール本文を編集して上書き保存する(仕様: game-detail/design.md「ゲームを編集して上書き保存する処理」)。
// 登録時(game-registration)と同じ検証を通してから運営者本人としてUPDATEする(既存の admin can update games RLSで担保)。
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

// ゲームを物理削除する(仕様: game-detail/design.md「運営者による物理削除の処理」、adr/0001)。
// deleted_atを立てる論理削除ではなく、該当行そのものをDELETEする。子レコード(コメント・
// お気に入り・通報)は子テーブルFKのON DELETE CASCADEで連動削除される。Storage実ファイルは残す。
// 運営者本人のみ実行できる(admin can delete games RLSで担保。20260820130000マイグレーション)。
export async function deleteGame(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('board_game_rules_games').delete().eq('id', id)
    return !error
  } catch {
    return false
  }
}
