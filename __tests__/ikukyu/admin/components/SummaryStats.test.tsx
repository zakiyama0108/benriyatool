import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SummaryStats from '../../../../app/ikukyu/admin/components/SummaryStats'
import type { Summary } from '../../../../app/ikukyu/admin/lib/types'

const summary: Summary = {
  count: 4,
  trend: { unit: 'month', points: [{ label: '2026-07', count: 3 }, { label: '2026-08', count: 1 }] },
  mode: { mamaCount: 3, papaCount: 1, mamaRatio: 0.75, papaRatio: 0.25 },
  salary: {
    average: 300000,
    buckets: [
      { label: '20万円未満', count: 0 },
      { label: '20万円以上30万円未満', count: 1 },
      { label: '30万円以上40万円未満', count: 3 },
      { label: '40万円以上50万円未満', count: 0 },
      { label: '50万円以上', count: 0 },
    ],
  },
  averages: { totalAmount: 1500000, totalLeaveDays: 350 },
}

// 仕様: specs/ikukyu/admin/requirements.md#集計表示-1、specs/ikukyu/admin/requirements.md#集計表示-2、specs/ikukyu/admin/requirements.md#集計表示-3、specs/ikukyu/admin/requirements.md#集計表示-4
describe('【管理】集計表示 - 件数・モード比率・月給分布・平均を表示する', () => {
  it('利用件数の合計が表示されること', () => {
    render(<SummaryStats summary={summary} />)
    expect(screen.getByText(/4件/)).toBeTruthy()
  })

  it('ママ・パパの比率が割合で表示されること', () => {
    render(<SummaryStats summary={summary} />)
    expect(screen.getByText(/75%/)).toBeTruthy()
    expect(screen.getByText(/25%/)).toBeTruthy()
  })

  it('月給の平均と、区分ごとの件数が表示されること', () => {
    render(<SummaryStats summary={summary} />)
    expect(screen.getByText(/300,000円/)).toBeTruthy()
    expect(screen.getByText(/30万円以上40万円未満/)).toBeTruthy()
  })

  it('合計給付額と合計取得日数の平均が表示されること', () => {
    render(<SummaryStats summary={summary} />)
    expect(screen.getByText(/1,500,000円/)).toBeTruthy()
    expect(screen.getByText(/350日/)).toBeTruthy()
  })
})

// 仕様: specs/ikukyu/admin/requirements.md#集計表示-3、specs/ikukyu/admin/requirements.md#集計表示-4
describe('【管理】集計表示(0件) - 対象が0件のとき平均を算出対象なしとする', () => {
  it('対象が0件のとき、平均が算出対象なしと分かる表示になること', () => {
    const empty: Summary = {
      count: 0,
      trend: { unit: 'month', points: [] },
      mode: { mamaCount: 0, papaCount: 0, mamaRatio: 0, papaRatio: 0 },
      salary: { average: null, buckets: summary.salary.buckets.map((b) => ({ ...b, count: 0 })) },
      averages: { totalAmount: null, totalLeaveDays: null },
    }
    render(<SummaryStats summary={empty} />)
    expect(screen.getAllByText(/—/).length).toBeGreaterThan(0)
  })
})
