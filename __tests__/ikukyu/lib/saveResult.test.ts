import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calcTotalLeaveDays, saveResult } from '../../../app/ikukyu/lib/saveResult'
import type { CalculatorInput, CalculatorResult } from '../../../app/ikukyu/lib/types'

const { insertMock, fromMock } = vi.hoisted(() => {
  const insertMock = vi.fn()
  const fromMock = vi.fn(() => ({ insert: insertMock }))
  return { insertMock, fromMock }
})

vi.mock('../../../app/lib/supabaseClient', () => ({
  supabase: { from: fromMock },
}))

beforeEach(() => {
  insertMock.mockReset().mockResolvedValue({ data: null, error: null })
  fromMock.mockClear()
})

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

const mamaInput: CalculatorInput = {
  mode: 'mama',
  monthlySalary: 300000,
  dueDate: '2026-11-01',
  leaveEndDate: '2027-10-31',
}

const result: CalculatorResult = {
  totalAmount: 1234567,
  summaryLabel: '出産手当金 + 育児休業給付金の合計',
  breakdownBar: [],
  benefits: [],
  paymentSchedules: [],
}

// 仕様: specs/ikukyu/save-result/requirements.md#機能要件-1
describe('【共通】計算結果の保存 - 入力内容と計算結果の合計額・合計取得日数をSupabaseのikukyu_resultsテーブルに保存する', () => {
  it('ママモードのとき、育休開始日はnullとしてikukyu_resultsテーブルに保存されること', async () => {
    await saveResult(mamaInput, result)

    expect(fromMock).toHaveBeenCalledWith('ikukyu_results')
    expect(insertMock).toHaveBeenCalledWith({
      mode: 'mama',
      monthly_salary: 300000,
      due_date: '2026-11-01',
      leave_start_date: null,
      leave_end_date: '2027-10-31',
      total_amount: 1234567,
      total_leave_days: 406,
    })
  })

  it('パパモードのとき、育休開始日もあわせて保存されること', async () => {
    const papaInput: CalculatorInput = {
      mode: 'papa',
      monthlySalary: 300000,
      dueDate: '2026-11-01',
      leaveStartDate: '2026-11-01',
      leaveEndDate: '2027-04-29',
    }

    await saveResult(papaInput, result)

    expect(insertMock).toHaveBeenCalledWith({
      mode: 'papa',
      monthly_salary: 300000,
      due_date: '2026-11-01',
      leave_start_date: '2026-11-01',
      leave_end_date: '2027-04-29',
      total_amount: 1234567,
      total_leave_days: 180,
    })
  })
})
