import { supabase } from '../../lib/supabaseClient'
import type { CalculatorInput, CalculatorResult } from './types'

// 合計取得日数は給付金明細(benefits)の日数を合計した値とする
// (仕様: specs/ikukyu/save-result/requirements.md#機能要件-2)
function calcTotalLeaveDays(result: CalculatorResult): number {
  return result.benefits.reduce((sum, benefit) => sum + benefit.days, 0)
}

// 計算結果をSupabaseに保存する。保存に失敗しても計算結果の表示自体は妨げないよう、
// エラーは外へ投げずに握りつぶす(分析用のベストエフォート処理のため)
export async function saveResult(input: CalculatorInput, result: CalculatorResult): Promise<void> {
  try {
    await supabase.from('ikukyu_results').insert({
      mode: input.mode,
      monthly_salary: input.monthlySalary,
      due_date: input.dueDate,
      leave_start_date: input.leaveStartDate ?? null,
      leave_end_date: input.leaveEndDate,
      total_amount: result.totalAmount,
      summary_label: result.summaryLabel,
      breakdown_bar: result.breakdownBar,
      benefits: result.benefits,
      payment_schedules: result.paymentSchedules,
      total_leave_days: calcTotalLeaveDays(result),
    })
  } catch {
    // 保存失敗時もユーザー操作をブロックしない(仕様: specs/ikukyu/save-result/requirements.md#エッジケース・例外処理-1)
  }
}
