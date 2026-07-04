import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import BenefitCard from '../../../app/ikukyu/components/BenefitCard'
import type { BenefitItem } from '../../../app/ikukyu/lib/types'

const childcare67: BenefitItem = {
  type: 'childcare67',
  officialName: '育児休業（育休）最初の180日',
  source: '雇用保険',
  startDate: '2026-12-28',
  endDate: '2027-06-25',
  days: 180,
  rateLabel: '休業前賃金の67%',
  amount: 1286280,
  dailyLimitReached: false,
}

const childcare67WithBonus: BenefitItem = {
  ...childcare67,
  bonusAmount: 38808,
}

// 仕様: specs/ikukyu/simulator/design.md#型定義（主要）（BenefitItem）
describe('【結果画面】給付金カード表示 - 1つの給付金について名称・財源・期間・金額・給付率を表示する', () => {
  it('給付金名・財源・対象期間・金額・給付率がすべて画面に表示されること', () => {
    render(<BenefitCard benefit={childcare67} />)
    expect(screen.getByText('育児休業（育休）最初の180日')).toBeDefined()
    expect(screen.getByText(/雇用保険/)).toBeDefined()
    expect(screen.getByText(/1,286,280/)).toBeDefined()
    expect(screen.getByText('休業前賃金の67%')).toBeDefined()
  })

  it('出生後休業支援給付金の上乗せがある場合、ヘッダーの金額が基本額と上乗せ額の合計で表示されること', () => {
    render(<BenefitCard benefit={childcare67WithBonus} />)
    // 1,286,280 + 38,808 = 1,325,088
    expect(screen.getByText('1,325,088円')).toBeDefined()
  })

  it('出生後休業支援給付金の上乗せがある場合、上乗せ分（+13%）の内訳金額も別途表示されること', () => {
    render(<BenefitCard benefit={childcare67WithBonus} />)
    expect(screen.getByText(/38,808/)).toBeDefined()
  })

  it('日額の上限に達した給付金には「上限適用」というラベルが表示されること', () => {
    render(<BenefitCard benefit={{ ...childcare67, dailyLimitReached: true }} />)
    expect(screen.getByText('上限適用')).toBeDefined()
  })

  it('日額の上限に達していない給付金には「未到達」というラベルが表示されること', () => {
    render(<BenefitCard benefit={childcare67} />)
    expect(screen.getByText('未到達')).toBeDefined()
  })

  it('対象外の給付金には「対象外」というバナーが表示されること', () => {
    render(<BenefitCard benefit={childcare67} isNotApplicable />)
    expect(screen.getByText('対象外')).toBeDefined()
  })
})
