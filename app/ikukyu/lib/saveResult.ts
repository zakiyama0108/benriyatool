import { getMaternityStartDate } from './dateUtils'
import { countDays } from './calculator'
import type { CalculatorInput } from './types'

// 合計取得日数は「休み始めの日」〜「育休終了予定日」の日数とする。
// 休み始めの日は、ママは産前休業開始日(出産予定日の42日前)、パパは育休開始日(未入力なら出産予定日)
// (仕様: specs/ikukyu/save-result/requirements.md#機能要件-2)
export function calcTotalLeaveDays(input: CalculatorInput): number {
  const startDate = input.mode === 'mama'
    ? getMaternityStartDate(input.dueDate)
    : input.leaveStartDate ?? input.dueDate

  return countDays(startDate, input.leaveEndDate)
}
