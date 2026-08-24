import { supabase } from '../../lib/supabaseClient'

// 理由テキストの文字数上限(report/design.md「通報を送信する処理」補足で1000に確定。DB側のCHECK制約と揃える)
const MAX_REASON_LENGTH = 1000

// ゲームを匿名で通報する(仕様: report/design.md「通報を送信する処理」)。
// 理由テキストは任意(空でも送信可)。トリム後に空なら通報者情報を持たないNULLで保存する。
// 上限を超える理由は送信せずfalseを返す(画面側+DB側CHECKの二重防御。design.md#セキュリティ)。
// 成功/失敗を呼び出し元が判別できるよう真偽値で返す(失敗時は再送できるようにする)。
export async function createReport(gameId: string, reason: string): Promise<boolean> {
  const trimmed = reason.trim()
  if (trimmed.length > MAX_REASON_LENGTH) return false

  try {
    const { error } = await supabase
      .from('board_game_rules_reports')
      .insert({ game_id: gameId, reason: trimmed === '' ? null : trimmed })
    return !error
  } catch {
    return false
  }
}
