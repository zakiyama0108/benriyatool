import { describe, it, expect } from 'vitest'
import { calcTotalLeaveDays } from '../../../app/ikukyu/lib/saveResult'
import type { CalculatorInput } from '../../../app/ikukyu/lib/types'

// 仕様: specs/ikukyu/save-result/requirements.md#機能要件-2
// 期待値は__tests__/ikukyu/lib/output.test.tsのbreakdownBarテストと同じ入力・同じ合計日数を使う
//   mama: 産休98日 + 育休前期180日 + 育休後期128日 = 406日
//   papa: 産後パパ育休28日 + 育休前期152日 = 180日(育休終了予定日=総育休180日目)
describe('【共通】合計取得日数の算出 - 休み始めの日から育休終了予定日までの日数を求める', () => {
  it('ママモードのとき、産前休業開始日(出産予定日の42日前)から育休終了予定日までの日数になること', () => {
    const input: CalculatorInput = {
      mode: 'mama',
      monthlySalary: 300000,
      dueDate: '2026-11-01',
      leaveEndDate: '2027-10-31',
    }
    expect(calcTotalLeaveDays(input)).toBe(406)
  })

  it('パパモードのとき、育休開始日から育休終了予定日までの日数になること', () => {
    const input: CalculatorInput = {
      mode: 'papa',
      monthlySalary: 300000,
      dueDate: '2026-11-01',
      leaveStartDate: '2026-11-01',
      leaveEndDate: '2027-04-29',
    }
    expect(calcTotalLeaveDays(input)).toBe(180)
  })
})
