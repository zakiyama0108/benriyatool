import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SummaryStats from '../../../../app/life-money-sim/admin/components/SummaryStats'
import type { Summary } from '../../../../app/life-money-sim/admin/lib/types'

const summary: Summary = {
  count: 4,
  trend: { unit: 'month', points: [{ label: '2026-07', count: 3 }, { label: '2026-08', count: 1 }] },
  spouse: { count: 2, ratio: 0.5 },
  mode: { investmentCount: 1, savingsCount: 3, investmentRatio: 0.25, savingsRatio: 0.75 },
  asset: {
    average: 1000,
    buckets: [
      { label: '100万円未満', count: 0 },
      { label: '100万円以上500万円未満', count: 1 },
      { label: '500万円以上1000万円未満', count: 3 },
      { label: '1000万円以上3000万円未満', count: 0 },
      { label: '3000万円以上', count: 0 },
    ],
  },
  averages: { monthlySurplus: 15 },
}

// 仕様: specs/life-money-sim/admin/requirements.md#集計表示-1、specs/life-money-sim/admin/requirements.md#集計表示-2、specs/life-money-sim/admin/requirements.md#集計表示-3、specs/life-money-sim/admin/requirements.md#集計表示-4
describe('【管理】集計表示 - 件数・配偶者割合・運用モード割合・資産分布・平均を表示する', () => {
  it('利用件数の合計が表示されること', () => {
    render(<SummaryStats summary={summary} />)
    expect(screen.getByText(/4件/)).toBeTruthy()
  })

  it('配偶者ありの割合と、運用モードの割合が表示されること', () => {
    render(<SummaryStats summary={summary} />)
    expect(screen.getByText(/50%/)).toBeTruthy()
    expect(screen.getByText(/75%/)).toBeTruthy()
    expect(screen.getByText(/25%/)).toBeTruthy()
  })

  it('最終月時点の資産額の平均と、区分ごとの件数が表示されること', () => {
    render(<SummaryStats summary={summary} />)
    expect(screen.getByText(/1,000万円/)).toBeTruthy()
    expect(screen.getByText(/500万円以上1000万円未満/)).toBeTruthy()
  })

  it('月次余剰資金の平均が表示されること', () => {
    render(<SummaryStats summary={summary} />)
    expect(screen.getByText(/15万円/)).toBeTruthy()
  })
})

// 仕様: specs/life-money-sim/admin/requirements.md#集計表示-2、specs/life-money-sim/admin/requirements.md#集計表示-3
describe('【管理】集計表示(0件) - 対象が0件のとき平均を算出対象なしとする', () => {
  it('対象が0件のとき、平均が算出対象なしと分かる表示になること', () => {
    const empty: Summary = {
      count: 0,
      trend: { unit: 'month', points: [] },
      spouse: { count: 0, ratio: 0 },
      mode: { investmentCount: 0, savingsCount: 0, investmentRatio: 0, savingsRatio: 0 },
      asset: { average: null, buckets: summary.asset.buckets.map((b) => ({ ...b, count: 0 })) },
      averages: { monthlySurplus: null },
    }
    render(<SummaryStats summary={empty} />)
    expect(screen.getAllByText(/—/).length).toBeGreaterThan(0)
  })
})
