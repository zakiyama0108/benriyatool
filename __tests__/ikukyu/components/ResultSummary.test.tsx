import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ResultSummary from '../../../app/ikukyu/components/ResultSummary'
import type { CalculatorResult } from '../../../app/ikukyu/lib/types'

const result: CalculatorResult = {
  totalAmount: 2000000,
  summaryLabel: '出産手当金 + 育児休業給付金の合計',
  breakdownBar: [
    { label: '産休', days: 98, colorClass: 'bg-rose-400' },
    { label: '育休（前期）', days: 180, colorClass: 'bg-teal-400' },
  ],
  benefits: [],
  paymentSchedules: [],
}

// 仕様: specs/ikukyu/simulator/requirements.md#機能要件-3
describe('【結果画面】計算結果サマリー表示 - 合計金額と内訳の見出し・凡例を表示する', () => {
  it('合計金額・見出し（summaryLabel）・内訳バーの凡例ラベルがすべて画面に表示されること', () => {
    render(<ResultSummary result={result} />)
    expect(screen.getByText(/2,000,000/)).toBeDefined()
    expect(screen.getByText('出産手当金 + 育児休業給付金の合計')).toBeDefined()
    expect(screen.getByText('産休')).toBeDefined()
    expect(screen.getByText('育休（前期）')).toBeDefined()
  })
})
