import { supabase } from '../../../lib/supabaseClient'

export type Report = {
  id: string
  gameId: string
  reason: string | null
  createdAt: string
}

type ReportRow = { id: string; game_id: string; reason: string | null; created_at: string }

// 運営者向けに通報一覧を新しい順で取得する(仕様: admin/design.md「通報を確認する処理」)。
// 取得に失敗した場合は例外を投げ、呼び出し元(画面)でエラー表示に切り替える
// (design.md#エラーハンドリング。空一覧との区別のため失敗を握りつぶさない)。
export async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('board_game_rules_reports')
    .select('id, game_id, reason, created_at')
    .order('created_at', { ascending: false })
  if (error) {
    throw new Error(`通報一覧の取得に失敗しました: ${error.message}`)
  }
  return ((data ?? []) as ReportRow[]).map((row) => ({
    id: row.id,
    gameId: row.game_id,
    reason: row.reason,
    createdAt: row.created_at,
  }))
}
