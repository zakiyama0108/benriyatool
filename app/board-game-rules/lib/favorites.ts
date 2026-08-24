import { supabase } from '../../lib/supabaseClient'
import { mapGameRowToGame, GAME_PUBLIC_COLUMNS, type Game, type GameRow } from './games'

type FavoriteRow = { id: string; game_id: string; created_at: string }

// お気に入り一覧の1項目。favoriteIdは一覧の各要素のkeyに使う(design.md「お気に入り一覧を
// 取得して表示する処理」補足。解除操作自体はgame_id指定のremoveFavoriteを使うため、
// favoriteIdをそれ以外の用途で使う想定はない)
export type FavoriteGame = { favoriteId: string; favoritedAt: string; game: Game }

// 画面内の自分のお気に入りgame_id集合をまとめて取得する(design.md「画面内のお気に入り状態を
// まとめて取得する処理」)。一覧の各ゲームごとに個別取得しない。取得に失敗した場合は
// 呼び出し元が「すべて未登録」として扱えるよう例外を投げる(bookmarkのfetchBookmarksByArticleDateと同じ方針)
export async function fetchMyFavoriteGameIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('board_game_rules_favorites').select('game_id')
  if (error) throw new Error(`お気に入り状態の取得に失敗しました: ${error.message}`)
  return new Set(((data ?? []) as Pick<FavoriteRow, 'game_id'>[]).map((row) => row.game_id))
}

// ログイン中の本人のお気に入りゲームを、登録日時の新しい順に取得する
// (design.md「お気に入り一覧を取得して表示する処理」)。取得方法は、design.mdが挙げる2案
// (結合 or game_id集合取得)のうち後者を選んだ: お気に入り行(game_id・created_at)をまず取得し、
// 対象ゲームをgame_idの集合でまとめて取得する2段階方式(「関連データを別クエリでまとめて取る」
// パターンに揃えられ、supabase-jsの結合構文に頼らずシンプルなため)。削除は物理削除に統一した
// ため(adr/0001)、削除済みゲームは行自体が存在せずgameMapに含まれず、そのお気に入りは自然に
// 一覧から除外される(design.md手順3)。取得に失敗した場合は呼び出し元が「0件」として扱えるよう例外を投げる
export async function fetchMyFavoriteGames(): Promise<FavoriteGame[]> {
  const favoritesResult = await supabase
    .from('board_game_rules_favorites')
    .select('id, game_id, created_at')
    .order('created_at', { ascending: false })
  if (favoritesResult.error) {
    throw new Error(`お気に入り一覧の取得に失敗しました: ${favoritesResult.error.message}`)
  }
  const favoriteRows = (favoritesResult.data ?? []) as FavoriteRow[]
  if (favoriteRows.length === 0) return []

  const gameIds = favoriteRows.map((row) => row.game_id)
  const gamesResult = await supabase.from('board_game_rules_games').select(GAME_PUBLIC_COLUMNS).in('id', gameIds)
  if (gamesResult.error) {
    throw new Error(`お気に入り一覧の取得に失敗しました: ${gamesResult.error.message}`)
  }
  const gameMap = new Map<string, Game>()
  for (const row of (gamesResult.data ?? []) as GameRow[]) {
    gameMap.set(row.id, mapGameRowToGame(row))
  }

  return favoriteRows
    .map((row) => {
      const game = gameMap.get(row.game_id)
      return game ? { favoriteId: row.id, favoritedAt: row.created_at, game } : null
    })
    .filter((item): item is FavoriteGame => item !== null)
}

// お気に入りを登録する(design.md「お気に入りを登録する処理」)。成功/失敗を呼び出し元が
// 判別できるよう真偽値で返す(ai-dev-digest/bookmarksのcreateBookmarkと同じ方針)
export async function addFavorite(gameId: string): Promise<boolean> {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData.user) return false

    const { error } = await supabase
      .from('board_game_rules_favorites')
      .insert({ user_id: userData.user.id, game_id: gameId })
    return !error
  } catch {
    return false
  }
}

// お気に入りを解除する(design.md「お気に入りを解除する処理」「お気に入り一覧からの解除」)。
// game_id指定で削除する(RLSにより本人の行のみが削除対象になるため、user_idの明示指定は
// 不要。FavoriteButtonのトグル解除にも、お気に入り一覧のその場解除にも同じ関数を使う)
export async function removeFavorite(gameId: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('board_game_rules_favorites').delete().eq('game_id', gameId)
    return !error
  } catch {
    return false
  }
}
