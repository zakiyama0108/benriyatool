import { supabase } from '../../../lib/supabaseClient'
import { mapGameRowToGame, type Game, type GameRow } from '../../lib/games'

type AdminGameRow = GameRow & { deleted_at: string | null; photo_paths: string[] }

export type AdminGame = Game & {
  deletedAt: string | null
  // 元写真の照合閲覧(admin/lib/photos.ts)に渡す非公開Storageのパス
  photoPaths: string[]
  reportCount: number
}

// 運営者向けに全ゲーム(削除済み含む)を通報件数付きで取得する
// (仕様: admin/design.md「ゲーム一覧を取得する処理」)。件数が少ない前提で、
// 全ゲーム+全通報を取得し件数はJS側で集計する(design.md#パフォーマンス)。
// 対応が必要なものを見つけやすいよう、通報件数の多い順・次いで新しい順に並べる。
export async function fetchAdminGames(): Promise<AdminGame[]> {
  const [gamesResult, reportsResult] = await Promise.all([
    supabase.from('board_game_rules_games').select('*'),
    supabase.from('board_game_rules_reports').select('game_id'),
  ])
  if (gamesResult.error) {
    throw new Error(`ゲーム一覧の取得に失敗しました: ${gamesResult.error.message}`)
  }
  if (reportsResult.error) {
    throw new Error(`通報件数の取得に失敗しました: ${reportsResult.error.message}`)
  }

  const reportCounts = new Map<string, number>()
  for (const report of (reportsResult.data ?? []) as { game_id: string }[]) {
    reportCounts.set(report.game_id, (reportCounts.get(report.game_id) ?? 0) + 1)
  }

  const games: AdminGame[] = ((gamesResult.data ?? []) as AdminGameRow[]).map((row) => ({
    ...mapGameRowToGame(row),
    deletedAt: row.deleted_at,
    photoPaths: row.photo_paths,
    reportCount: reportCounts.get(row.id) ?? 0,
  }))

  games.sort((a, b) => {
    if (b.reportCount !== a.reportCount) return b.reportCount - a.reportCount
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  return games
}
