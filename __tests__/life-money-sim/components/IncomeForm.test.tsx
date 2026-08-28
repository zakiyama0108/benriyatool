import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import IncomeForm from '../../../app/life-money-sim/components/IncomeForm'
import type { IncomeInput } from '../../../app/life-money-sim/lib/types'

const baseIncome: IncomeInput = { monthlySalary: 0, bonusMonths: [], bonusAmountPerTime: 0 }

// 仕様: specs/life-money-sim/monthly-balance/requirements.md#収入-2
describe('収入フォームのボーナス支給月入力', () => {
  it('未選択の支給月をクリックすると、その月がbonusMonthsへ昇順で追加されてonChangeに渡ること', () => {
    const onChange = vi.fn()
    render(<IncomeForm income={{ ...baseIncome, bonusMonths: [12] }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '6月' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ bonusMonths: [6, 12] }))
  })

  it('選択済みの支給月をクリックすると、その月がbonusMonthsから外れてonChangeに渡ること', () => {
    const onChange = vi.fn()
    render(<IncomeForm income={{ ...baseIncome, bonusMonths: [6, 12] }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '6月' }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ bonusMonths: [12] }))
  })

  it('選択済みの支給月はaria-pressedがtrueで示されること', () => {
    render(<IncomeForm income={{ ...baseIncome, bonusMonths: [6] }} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: '6月' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '7月' }).getAttribute('aria-pressed')).toBe('false')
  })
})
