import { supabase } from '../../lib/supabaseClient'
import { getMaternityStartDate } from './dateUtils'
import { countDays } from './calculator'
import type { CalculatorInput, CalculatorResult } from './types'

// 合計取得日数は「休み始めの日」〜「育休終了予定日」の日数とする。
// 休み始めの日は、ママは産前休業開始日(出産予定日の42日前)、パパは育休開始日(未入力なら出産予定日)
// (仕様: specs/ikukyu/save-result/requirements.md#機能要件-2)
export function calcTotalLeaveDays(input: CalculatorInput): number {
  const startDate = input.mode === 'mama'
    ? getMaternityStartDate(input.dueDate)
    : input.leaveStartDate ?? input.dueDate

  return countDays(startDate, input.leaveEndDate)
}

// 入力内容と計算結果の合計額・合計取得日数をikukyu_resultsテーブルへ保存する。
// 保存に失敗しても計算結果の表示自体は妨げないよう、エラーは外へ投げずに握りつぶす
// (仕様: specs/ikukyu/save-result/requirements.md#機能要件-1、エッジケース・例外処理-1)
export async function saveResult(input: CalculatorInput, result: CalculatorResult): Promise<void> {
  try {
    await supabase.from('ikukyu_results').insert({
      mode: input.mode,
      monthly_salary: input.monthlySalary,
      due_date: input.dueDate,
      leave_start_date: input.leaveStartDate ?? null,
      leave_end_date: input.leaveEndDate,
      total_amount: result.totalAmount,
      total_leave_days: calcTotalLeaveDays(input),
    })
  } catch {
    // 保存失敗時もユーザー操作をブロックしない(分析用のベストエフォート処理のため)
  }
}
