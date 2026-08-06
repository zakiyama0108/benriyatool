import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchScenarios, saveScenario, deleteScenario, updateScenario, fillMissingScenarioFields } from '../../../app/life-money-sim/lib/savedScenario'
import type { ScenarioInputState } from '../../../app/life-money-sim/lib/types'

const { selectMock, orderMock, insertMock, eqMock, updateEqMock, updateMock, fromMock, getUserMock } = vi.hoisted(() => {
  const orderMock = vi.fn()
  const selectMock = vi.fn(() => ({ order: orderMock }))
  const insertMock = vi.fn()
  const eqMock = vi.fn()
  const deleteMock = vi.fn(() => ({ eq: eqMock }))
  const updateEqMock = vi.fn()
  const updateMock = vi.fn(() => ({ eq: updateEqMock }))
  const fromMock = vi.fn(() => ({ select: selectMock, insert: insertMock, delete: deleteMock, update: updateMock }))
  const getUserMock = vi.fn()
  return { selectMock, orderMock, insertMock, deleteMock, eqMock, updateEqMock, updateMock, fromMock, getUserMock }
})

vi.mock('../../../app/lib/supabaseClient', () => ({
  supabase: { from: fromMock, auth: { getUser: getUserMock } },
}))

beforeEach(() => {
  fromMock.mockClear()
  selectMock.mockClear()
  orderMock.mockReset().mockResolvedValue({ data: [], error: null })
  insertMock.mockReset().mockResolvedValue({ data: null, error: null })
  eqMock.mockReset().mockResolvedValue({ data: null, error: null })
  updateMock.mockClear()
  updateEqMock.mockReset().mockResolvedValue({ data: null, error: null })
  getUserMock.mockReset().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
})

const inputState: ScenarioInputState = {
  income: { monthlySalary: 35, bonusCount: 2, bonusAmountPerTime: 10 },
  personalExpense: { annualItems: [], monthlyItems: [] },
  household: { hasSpouse: false, items: [], myShare: 0 },
  familyProfile: { selfBirthMonth: '1990-04', spouseBirthMonth: null, childrenCount: 0, childrenBirthMonths: [] },
  startingAssetInput: { startingAsset: 300, startYearMonth: '2026-07', displayYears: 30 },
  bonuses: [],
  events: [],
  recurringEntries: [],
  investmentModeInput: { investmentMode: false, expectedAnnualRate: 0 },
}

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#ログイン時の自動読み込み-8、specs/life-money-sim/saved-scenario/requirements.md#一覧・読み込み・削除-5
describe('マイシナリオの一覧取得 - 本人のシナリオを保存日時の新しい順で取得する', () => {
  it('取得したレコードが名前・保存日時・入力値一式を持つScenarioRecordへ変換されること', async () => {
    orderMock.mockResolvedValue({
      data: [{ id: 'a', name: '子ども2人パターン', input_state: inputState, created_at: '2026-07-20T00:00:00Z' }],
      error: null,
    })
    const result = await fetchScenarios()
    expect(fromMock).toHaveBeenCalledWith('life_money_sim_saved_scenarios')
    expect(result).toEqual([
      { id: 'a', name: '子ども2人パターン', inputState, createdAt: '2026-07-20T00:00:00Z' },
    ])
  })

  it('取得に失敗した場合、呼び出し元がエラー表示に倒せるよう例外を投げること', async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: 'network error' } })
    await expect(fetchScenarios()).rejects.toThrow()
  })
})

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#保存-3
describe('名前を付けて保存する - 現在の入力値一式をログイン中の本人のシナリオとして新規保存する', () => {
  it('保存に成功した場合、trueが返り、ログイン中の本人のuser_idで新規INSERTされること', async () => {
    await expect(saveScenario('子ども2人パターン', inputState)).resolves.toBe(true)
    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'user-1',
      name: '子ども2人パターン',
      input_state: inputState,
    })
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    insertMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    await expect(saveScenario('子ども2人パターン', inputState)).resolves.toBe(false)
  })

  it('保存処理が例外を投げた場合も、falseで正常終了すること', async () => {
    insertMock.mockRejectedValue(new Error('network error'))
    await expect(saveScenario('子ども2人パターン', inputState)).resolves.toBe(false)
  })
})

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#一覧・読み込み・削除-7
describe('削除する - 指定したシナリオを削除する', () => {
  it('削除に成功した場合、trueが返り、指定したidで削除されること', async () => {
    await expect(deleteScenario('a')).resolves.toBe(true)
    expect(eqMock).toHaveBeenCalledWith('id', 'a')
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    eqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    await expect(deleteScenario('a')).resolves.toBe(false)
  })
})

// 仕様: specs/life-money-sim/saved-scenario/design.md#名前を付けて保存する処理
describe('上書き更新する - 対象シナリオを現在の入力値一式でUPDATEする', () => {
  it('更新に成功した場合、trueが返り、対象idの行がinput_stateでUPDATEされること(名前は変更しない)', async () => {
    await expect(updateScenario('a', inputState)).resolves.toBe(true)
    expect(updateMock).toHaveBeenCalledWith({ input_state: inputState })
    expect(updateEqMock).toHaveBeenCalledWith('id', 'a')
  })

  it('Supabaseが{error}を返した場合、falseが返ること', async () => {
    updateEqMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    await expect(updateScenario('a', inputState)).resolves.toBe(false)
  })

  it('更新処理が例外を投げた場合も、falseで正常終了すること', async () => {
    updateMock.mockImplementation(() => {
      throw new Error('network error')
    })
    await expect(updateScenario('a', inputState)).resolves.toBe(false)
  })
})

// 仕様: specs/life-money-sim/saved-scenario/design.md#保存対象の入力値
describe('保存済み入力値の欠損フィールド補完 - 将来の型変更で古い保存データにフィールドが無くても復元できるようにする', () => {
  it('保存済みデータにすべてのフィールドがある場合、そのまま復元されること', () => {
    const result = fillMissingScenarioFields(inputState, inputState)
    expect(result).toEqual(inputState)
  })

  it('保存済みデータから一部のフィールド(events)が欠けている場合、そのフィールドだけ現在の初期値で補われること', () => {
    const withoutEvents: Partial<ScenarioInputState> = {
      income: inputState.income,
      personalExpense: inputState.personalExpense,
      household: inputState.household,
      familyProfile: inputState.familyProfile,
      startingAssetInput: inputState.startingAssetInput,
      bonuses: inputState.bonuses,
      investmentModeInput: inputState.investmentModeInput,
      // events は意図的に含めない(欠損フィールドの復元テストのため)
    }
    const currentDefault: ScenarioInputState = { ...inputState, events: [{ yearMonth: '2027-01', label: '初期値', amount: 0 }] }
    const result = fillMissingScenarioFields(withoutEvents, currentDefault)
    expect(result.events).toEqual(currentDefault.events)
    expect(result.income).toEqual(inputState.income)
  })

  it('保存済みデータのstartingAssetInputにdisplayYearsだけが無い場合(displayYears追加前の旧データ)、displayYearsのみ現在の初期値で補われ、startingAsset・startYearMonthは保存値のまま復元されること', () => {
    const legacyStartingAssetInput = { startingAsset: 300, startYearMonth: '2026-07' } as ScenarioInputState['startingAssetInput']
    const stored: Partial<ScenarioInputState> = { ...inputState, startingAssetInput: legacyStartingAssetInput }
    const result = fillMissingScenarioFields(stored, inputState)
    expect(result.startingAssetInput).toEqual({ startingAsset: 300, startYearMonth: '2026-07', displayYears: 30 })
  })

  it('保存済みデータにrecurringEntriesが無い場合(定期的な収入・支出の登録追加前の旧データ)、recurringEntriesが現在の初期値([])で補われること', () => {
    const legacyStored: Partial<ScenarioInputState> = { ...inputState }
    delete legacyStored.recurringEntries
    const currentDefault: ScenarioInputState = {
      ...inputState,
      recurringEntries: [
        { label: '家賃', amount: 8, type: 'expense', startYearMonth: '2026-01', endYearMonth: '2026-12', frequencyMonths: 1 },
      ],
    }
    const result = fillMissingScenarioFields(legacyStored, currentDefault)
    expect(result.recurringEntries).toEqual(currentDefault.recurringEntries)
  })
})
