import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ScenarioPanel from '../../../app/life-money-sim/components/ScenarioPanel'
import type { ScenarioRecord } from '../../../app/life-money-sim/lib/types'

const dummyInputState = {
  income: { monthlySalary: 0, bonusCount: 0, bonusAmountPerTime: 0 },
  personalExpense: { annualItems: [], monthlyItems: [] },
  household: { hasSpouse: false, items: [], myShare: 0 },
  familyProfile: { selfBirthMonth: null, spouseBirthMonth: null, childrenCount: 0, childrenBirthMonths: [] },
  startingAssetInput: { startingAsset: 0, startYearMonth: '2026-07' },
  bonuses: [],
  events: [],
  investmentModeInput: { investmentMode: false, expectedAnnualRate: 0 },
}

const scenarios: ScenarioRecord[] = [
  { id: 'a', name: '子ども2人パターン', inputState: dummyInputState, createdAt: '2026-07-20T00:00:00Z' },
  { id: 'b', name: '転職後パターン', inputState: dummyInputState, createdAt: '2026-07-18T00:00:00Z' },
]

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#保存-3、specs/life-money-sim/saved-scenario/requirements.md#保存-4
describe('マイシナリオの保存操作 - 名前を入力して保存する', () => {
  it('名前を入力して保存ボタンを押すと、入力した名前でonSaveが呼ばれること', () => {
    const onSave = vi.fn()
    render(<ScenarioPanel scenarios={[]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('シナリオ名'), { target: { value: '子ども2人パターン' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))
    expect(onSave).toHaveBeenCalledWith('子ども2人パターン')
  })

  it('名前が未入力の場合、保存ボタンが無効化され、押してもonSaveが呼ばれないこと', () => {
    const onSave = vi.fn()
    render(<ScenarioPanel scenarios={[]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    const button = screen.getByRole('button', { name: '保存する' })
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(onSave).not.toHaveBeenCalled()
  })
})

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#一覧・読み込み・削除-5、specs/life-money-sim/saved-scenario/requirements.md#一覧・読み込み・削除-6、specs/life-money-sim/saved-scenario/requirements.md#一覧・読み込み・削除-7
describe('マイシナリオの一覧・読み込み・削除', () => {
  it('保存済みシナリオが名前とともに一覧表示されること', () => {
    render(<ScenarioPanel scenarios={scenarios} onSave={vi.fn()} onLoad={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('子ども2人パターン')).toBeTruthy()
    expect(screen.getByText('転職後パターン')).toBeTruthy()
  })

  it('一覧から「読み込む」を押すと、そのシナリオのidでonLoadが呼ばれること', () => {
    const onLoad = vi.fn()
    render(<ScenarioPanel scenarios={scenarios} onSave={vi.fn()} onLoad={onLoad} onDelete={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: '読み込む' })[0])
    expect(onLoad).toHaveBeenCalledWith('a')
  })

  it('一覧から「削除する」を押すと、そのシナリオのidでonDeleteが呼ばれること', () => {
    const onDelete = vi.fn()
    render(<ScenarioPanel scenarios={scenarios} onSave={vi.fn()} onLoad={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getAllByRole('button', { name: '削除する' })[1])
    expect(onDelete).toHaveBeenCalledWith('b')
  })

  it('保存済みシナリオが0件の場合、その旨が分かる表示になること', () => {
    render(<ScenarioPanel scenarios={[]} onSave={vi.fn()} onLoad={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/保存されたシナリオはありません/)).toBeTruthy()
  })
})
