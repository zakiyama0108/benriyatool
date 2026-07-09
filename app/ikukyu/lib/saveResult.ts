import type { CalculatorResult } from './types'

// 合計取得日数は給付金明細(benefits)の日数を合計した値とする
// (仕様: specs/ikukyu/save-result/requirements.md#機能要件-2)
export function calcTotalLeaveDays(result: CalculatorResult): number {
  return result.benefits.reduce((sum, benefit) => sum + benefit.days, 0)
}
