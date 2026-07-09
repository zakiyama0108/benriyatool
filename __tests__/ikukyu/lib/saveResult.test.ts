import { describe, it, expect } from 'vitest'
import { calcTotalLeaveDays } from '../../../app/ikukyu/lib/saveResult'
import type { CalculatorResult } from '../../../app/ikukyu/lib/types'

function makeResult(benefitDays: number[]): CalculatorResult {
  return {
    totalAmount: 0,
    summaryLabel: '',
    breakdownBar: [],
    benefits: benefitDays.map((days) => ({
      type: 'maternity',
      officialName: '産前産後休業（産休）',
      source: '健康保険',
      startDate: '2026-09-20',
      endDate: '2026-12-26',
      days,
      rateLabel: '標準報酬日額の2/3',
      amount: 0,
      dailyLimitReached: false,
    })),
    paymentSchedules: [],
  }
}

// 仕様: specs/ikukyu/save-result/requirements.md#機能要件-2
describe('【共通】合計取得日数の算出 - 給付金明細の日数を合計した値を求める', () => {
  it('給付金明細が複数ある場合、それぞれの日数を合計した値になること', () => {
    expect(calcTotalLeaveDays(makeResult([98, 180, 128]))).toBe(406)
  })

  it('給付金明細が1件だけの場合、その日数がそのまま返ること', () => {
    expect(calcTotalLeaveDays(makeResult([28]))).toBe(28)
  })
})
