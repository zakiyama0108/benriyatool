import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SaveButton from '../../../app/life-money-sim/components/SaveButton'
import type { SaveResultInput } from '../../../app/life-money-sim/lib/types'

const { saveResultMock } = vi.hoisted(() => ({ saveResultMock: vi.fn() }))
vi.mock('../../../app/life-money-sim/lib/saveResult', () => ({ saveResult: saveResultMock }))

const dummyInput: SaveResultInput = {
  hasSpouse: false,
  childrenCount: 0,
  monthlySalary: 30,
  personalExpenseMonthly: 10,
  householdExpenseTotal: 0,
  myHouseholdShare: 0,
  startingAsset: 100,
  investmentMode: false,
  expectedAnnualRate: 0,
  eventCount: 0,
  finalMonthAsset: 100,
  monthlySurplus: 20,
}

// 仕様: specs/life-money-sim/save-result/requirements.md#機能要件-3
describe('匿名保存ボタンの文言 - 「保存」を含まない表現にし、マイシナリオ(本人専用保存)との誤解を避ける', () => {
  it('ボタンの文言が「この試算を実行する」であること(「保存」という語を含まない)', () => {
    render(<SaveButton input={dummyInput} />)
    expect(screen.getByRole('button', { name: 'この試算を実行する' })).toBeTruthy()
  })

  it('押すと送信中の表示になり、完了後は送信完了が分かる表示になること', async () => {
    saveResultMock.mockResolvedValue(true)
    render(<SaveButton input={dummyInput} />)
    fireEvent.click(screen.getByRole('button', { name: 'この試算を実行する' }))

    const button = screen.getByRole('button', { name: '実行中…' })
    expect(button.hasAttribute('disabled')).toBe(true)

    await waitFor(() => expect(screen.getByText('送信しました')).toBeTruthy())
  })
})
