import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ScenarioPanel from '../../../app/life-money-sim/components/ScenarioPanel'
import type { ScenarioRecord } from '../../../app/life-money-sim/lib/types'

const dummyInputState = {
  income: { monthlySalary: 0, bonusCount: 0, bonusAmountPerTime: 0 },
  personalExpense: { annualItems: [], monthlyItems: [] },
  household: { hasSpouse: false, items: [], myShare: 0 },
  familyProfile: { selfBirthMonth: null, spouseBirthMonth: null, childrenCount: 0, childrenBirthMonths: [] },
  startingAssetInput: { startingAsset: 0, startYearMonth: '2026-07', displayYears: 30 },
  bonuses: [],
  events: [],
  recurringEntries: [],
  investmentModeInput: { investmentMode: false, expectedAnnualRate: 0 },
}

const scenarios: ScenarioRecord[] = [
  { id: 'a', name: '子ども2人パターン', inputState: dummyInputState, createdAt: '2026-07-20T00:00:00Z' },
  { id: 'b', name: '転職後パターン', inputState: dummyInputState, createdAt: '2026-07-18T00:00:00Z' },
]

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#保存-3、specs/life-money-sim/saved-scenario/requirements.md#保存-4
describe('マイシナリオの保存操作 - 名前を入力して保存する', () => {
  it('名前を入力して保存ボタンを押すと、入力した名前でonSaveが呼ばれること', async () => {
    const onSave = vi.fn().mockResolvedValue(true)
    render(<ScenarioPanel activeScenario={null} scenarios={[]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('シナリオ名'), { target: { value: '子ども2人パターン' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))
    expect(onSave).toHaveBeenCalledWith('子ども2人パターン')
    await waitFor(() => expect(screen.getByText('保存しました')).toBeTruthy())
  })

  it('名前が未入力の場合、保存ボタンが無効化され、押してもonSaveが呼ばれないこと', () => {
    const onSave = vi.fn()
    render(<ScenarioPanel activeScenario={null} scenarios={[]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    const button = screen.getByRole('button', { name: '保存する' })
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
    expect(onSave).not.toHaveBeenCalled()
  })
})

// 仕様: specs/life-money-sim/saved-scenario/design.md#エラーハンドリング、specs/life-money-sim/saved-scenario/design.md#名前を付けて保存する処理
describe('保存中・保存失敗時の表示 - 処理中は再押下できず、失敗が分かる表示をする', () => {
  it('保存処理が完了するまでボタンが「保存中…」になり、再押下できないこと', async () => {
    let resolveSave: (ok: boolean) => void = () => {}
    const onSave = vi.fn(() => new Promise<boolean>((resolve) => { resolveSave = resolve }))
    render(<ScenarioPanel activeScenario={null} scenarios={[]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('シナリオ名'), { target: { value: 'テスト' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    const button = screen.getByRole('button', { name: '保存中…' })
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
    expect(onSave).toHaveBeenCalledTimes(1)

    resolveSave(true)
    await waitFor(() => expect(screen.getByText('保存しました')).toBeTruthy())
  })

  it('保存処理が完了するまで名前欄も無効化され、通信中に名前を書き換えて二重に保存できないこと', async () => {
    let resolveSave: (ok: boolean) => void = () => {}
    const onSave = vi.fn(() => new Promise<boolean>((resolve) => { resolveSave = resolve }))
    render(<ScenarioPanel activeScenario={null} scenarios={[]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('シナリオ名'), { target: { value: 'テスト' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    const nameInput = screen.getByPlaceholderText('シナリオ名')
    expect(nameInput.hasAttribute('disabled')).toBe(true)
    expect(onSave).toHaveBeenCalledTimes(1)

    resolveSave(true)
    await waitFor(() => expect(screen.getByText('保存しました')).toBeTruthy())
  })

  it('保存に失敗した場合、失敗が分かる表示になること', async () => {
    const onSave = vi.fn().mockResolvedValue(false)
    render(<ScenarioPanel activeScenario={null} scenarios={[]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('シナリオ名'), { target: { value: 'テスト' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))
    await waitFor(() => expect(screen.getByText(/保存に失敗しました/)).toBeTruthy())
  })
})

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#一覧・読み込み・削除-5、specs/life-money-sim/saved-scenario/requirements.md#一覧・読み込み・削除-6、specs/life-money-sim/saved-scenario/requirements.md#一覧・読み込み・削除-7
describe('マイシナリオの一覧・読み込み・削除', () => {
  it('保存済みシナリオが名前とともに一覧表示されること', () => {
    render(<ScenarioPanel activeScenario={null} scenarios={scenarios} onSave={vi.fn()} onLoad={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('子ども2人パターン')).toBeTruthy()
    expect(screen.getByText('転職後パターン')).toBeTruthy()
  })

  it('一覧から「読み込む」を押すと、そのシナリオのidでonLoadが呼ばれること', () => {
    const onLoad = vi.fn()
    render(<ScenarioPanel activeScenario={null} scenarios={scenarios} onSave={vi.fn()} onLoad={onLoad} onDelete={vi.fn()} />)
    fireEvent.click(screen.getAllByRole('button', { name: '読み込む' })[0])
    expect(onLoad).toHaveBeenCalledWith('a')
  })

  it('一覧から「削除する」を押すと、そのシナリオのidでonDeleteが呼ばれること', () => {
    const onDelete = vi.fn().mockResolvedValue(true)
    render(<ScenarioPanel activeScenario={null} scenarios={scenarios} onSave={vi.fn()} onLoad={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getAllByRole('button', { name: '削除する' })[1])
    expect(onDelete).toHaveBeenCalledWith('b')
  })

  it('保存済みシナリオが0件の場合、その旨が分かる表示になること', () => {
    render(<ScenarioPanel activeScenario={null} scenarios={[]} onSave={vi.fn()} onLoad={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText(/保存されたシナリオはありません/)).toBeTruthy()
  })
})

const activeScenario: ScenarioRecord = {
  id: 'a',
  name: '子ども2人パターン',
  inputState: dummyInputState,
  createdAt: '2026-07-20T00:00:00Z',
}

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#上書き保存-11、specs/life-money-sim/saved-scenario/requirements.md#上書き保存-12、specs/life-money-sim/saved-scenario/design.md#名前を付けて保存する処理、specs/life-money-sim/saved-scenario/design.md#画面設計
describe('マイシナリオの上書き保存 - アクティブなシナリオがある場合の名前欄・ボタン文言', () => {
  it('アクティブなシナリオがある場合、名前欄の初期値がそのシナリオの名前になり、保存ボタンの文言が「更新する」になること', () => {
    render(<ScenarioPanel activeScenario={activeScenario} scenarios={[activeScenario]} onSave={vi.fn()} onLoad={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByPlaceholderText<HTMLInputElement>('シナリオ名').value).toBe('子ども2人パターン')
    expect(screen.getByRole('button', { name: '更新する' })).toBeTruthy()
  })
})

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#上書き保存-12
describe('マイシナリオの上書き保存 - 更新前に確認ダイアログを表示する', () => {
  it('「更新する」を押すと対象のシナリオ名を含む確認ダイアログが表示され、確認した場合のみonSaveが呼ばれること', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const onSave = vi.fn().mockResolvedValue(true)
    render(<ScenarioPanel activeScenario={activeScenario} scenarios={[activeScenario]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '更新する' }))
    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining('子ども2人パターン'))
    expect(onSave).toHaveBeenCalledWith('子ども2人パターン')
    await waitFor(() => expect(screen.getByText('保存しました')).toBeTruthy())
    confirmSpy.mockRestore()
  })

  it('確認ダイアログでキャンセルした場合、何も送信されず(onSaveが呼ばれず)処理が中断されること', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const onSave = vi.fn()
    render(<ScenarioPanel activeScenario={activeScenario} scenarios={[activeScenario]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: '更新する' }))
    expect(onSave).not.toHaveBeenCalled()
    confirmSpy.mockRestore()
  })
})

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#上書き保存-13
describe('マイシナリオの上書き保存 - 名前欄を変更すると新規保存の扱いに戻る', () => {
  it('アクティブなシナリオがある状態で名前欄を別の名前に変更すると、ボタン文言が「保存する」に戻り、確認ダイアログを出さずにonSaveが呼ばれること', () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const onSave = vi.fn().mockResolvedValue(true)
    render(<ScenarioPanel activeScenario={activeScenario} scenarios={[activeScenario]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('シナリオ名'), { target: { value: '転職後パターン' } })
    expect(screen.getByRole('button', { name: '保存する' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith('転職後パターン')
    confirmSpy.mockRestore()
  })
})

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#上書き保存-14
describe('マイシナリオの保存 - アクティブなシナリオがない場合は常に新規保存する', () => {
  it('アクティブなシナリオがない状態で保存すると、確認ダイアログを出さずにonSaveが呼ばれること', () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    const onSave = vi.fn().mockResolvedValue(true)
    render(<ScenarioPanel activeScenario={null} scenarios={[]} onSave={onSave} onLoad={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByPlaceholderText('シナリオ名'), { target: { value: '新しいパターン' } })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))
    expect(confirmSpy).not.toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledWith('新しいパターン')
    confirmSpy.mockRestore()
  })
})

// 仕様: specs/life-money-sim/saved-scenario/design.md#エラーハンドリング、specs/life-money-sim/saved-scenario/design.md#削除する処理
describe('削除中・削除失敗時の表示 - 処理中の行は再押下できず、失敗が分かる表示をする', () => {
  it('削除処理が完了するまで、その行のボタンが「削除中…」になり再押下できないこと', async () => {
    let resolveDelete: (ok: boolean) => void = () => {}
    const onDelete = vi.fn(() => new Promise<boolean>((resolve) => { resolveDelete = resolve }))
    render(<ScenarioPanel activeScenario={null} scenarios={scenarios} onSave={vi.fn()} onLoad={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getAllByRole('button', { name: '削除する' })[0])

    const button = screen.getByRole('button', { name: '削除中…' })
    expect(button.hasAttribute('disabled')).toBe(true)
    fireEvent.click(button)
    expect(onDelete).toHaveBeenCalledTimes(1)

    resolveDelete(true)
    await waitFor(() => expect(screen.queryByRole('button', { name: '削除中…' })).toBeNull())
  })

  it('ある行の削除処理中は、他の行の読み込む・削除するボタンも無効化されること', async () => {
    let resolveDelete: (ok: boolean) => void = () => {}
    const onDelete = vi.fn(() => new Promise<boolean>((resolve) => { resolveDelete = resolve }))
    const onLoad = vi.fn()
    render(<ScenarioPanel activeScenario={null} scenarios={scenarios} onSave={vi.fn()} onLoad={onLoad} onDelete={onDelete} />)
    fireEvent.click(screen.getAllByRole('button', { name: '削除する' })[0])

    const otherLoadButton = screen.getAllByRole('button', { name: '読み込む' })[1]
    expect(otherLoadButton.hasAttribute('disabled')).toBe(true)
    fireEvent.click(otherLoadButton)
    expect(onLoad).not.toHaveBeenCalled()

    resolveDelete(true)
    await waitFor(() => expect(screen.queryByRole('button', { name: '削除中…' })).toBeNull())
  })

  it('削除に失敗した場合、その行に失敗が分かる表示が出ること', async () => {
    const onDelete = vi.fn().mockResolvedValue(false)
    render(<ScenarioPanel activeScenario={null} scenarios={scenarios} onSave={vi.fn()} onLoad={vi.fn()} onDelete={onDelete} />)
    fireEvent.click(screen.getAllByRole('button', { name: '削除する' })[0])
    await waitFor(() => expect(screen.getByText(/削除に失敗しました/)).toBeTruthy())
  })
})
