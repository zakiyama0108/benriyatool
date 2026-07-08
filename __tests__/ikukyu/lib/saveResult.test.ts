import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveResult } from '../../../app/ikukyu/lib/saveResult'
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

const mamaInput: CalculatorInput = {
  mode: 'mama',
  monthlySalary: 300000,
  dueDate: '2026-11-01',
  leaveEndDate: '2027-10-31',
}

const result: CalculatorResult = {
  totalAmount: 500000,
  summaryLabel: '出産手当金 + 育児休業給付金の合計',
  breakdownBar: [{ label: '産休', days: 10, colorClass: 'bg-rose-400' }],
  benefits: [
    {
      type: 'maternity',
      officialName: '産前産後休業（産休）',
      source: '健康保険',
      startDate: '2026-09-20',
      endDate: '2026-11-27',
      days: 10,
      rateLabel: '標準報酬日額の2/3',
      amount: 300000,
      dailyLimitReached: false,
    },
    {
      type: 'childcare67',
      officialName: '育児休業（育休）最初の180日',
      source: '雇用保険',
      startDate: '2026-11-28',
      endDate: '2027-05-27',
      days: 20,
      rateLabel: '休業前賃金の67%',
      amount: 200000,
      dailyLimitReached: false,
    },
  ],
  paymentSchedules: [],
}

// 仕様: specs/ikukyu/save-result/requirements.md#機能要件-1
describe('【共通】計算結果の保存 - 入力内容と計算結果をSupabaseのikukyu_resultsテーブルに保存する', () => {
  it('ママモードのとき、育休開始日はnullとしてikukyu_resultsテーブルに保存されること', async () => {
    await saveResult(mamaInput, result)

    expect(fromMock).toHaveBeenCalledWith('ikukyu_results')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'mama',
        monthly_salary: 300000,
        due_date: '2026-11-01',
        leave_start_date: null,
        leave_end_date: '2027-10-31',
        total_amount: 500000,
        summary_label: '出産手当金 + 育児休業給付金の合計',
        breakdown_bar: result.breakdownBar,
        benefits: result.benefits,
        payment_schedules: result.paymentSchedules,
      })
    )
  })

  it('パパモードのとき、育休開始日もあわせて保存されること', async () => {
    const papaInput: CalculatorInput = { ...mamaInput, mode: 'papa', leaveStartDate: '2026-11-01' }

    await saveResult(papaInput, result)

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'papa', leave_start_date: '2026-11-01' })
    )
  })
})

// 仕様: specs/ikukyu/save-result/requirements.md#機能要件-2
describe('【共通】合計取得日数の算出 - 給付金明細の日数を合計した値を保存する', () => {
  it('給付金明細が複数ある場合、それぞれの日数を合計した値が合計取得日数になること', async () => {
    await saveResult(mamaInput, result)

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ total_leave_days: 30 }))
  })
})

// 仕様: specs/ikukyu/save-result/requirements.md#エッジケース・例外処理-1
describe('【共通】保存失敗時の扱い - DBへの保存に失敗しても計算結果表示には影響させない', () => {
  it('Supabaseへの保存が例外を投げても、saveResultはエラーを外に投げず正常終了すること', async () => {
    insertMock.mockRejectedValue(new Error('network error'))

    await expect(saveResult(mamaInput, result)).resolves.toBeUndefined()
  })
})
