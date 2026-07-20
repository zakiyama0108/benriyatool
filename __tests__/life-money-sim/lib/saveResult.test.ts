import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isTestData, buildResultRecord, saveResult } from '../../../app/life-money-sim/lib/saveResult'
import type { SaveResultInput } from '../../../app/life-money-sim/lib/types'

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

afterEach(() => {
  vi.unstubAllEnvs()
  window.history.replaceState(null, '', '/life-money-sim/')
})

// 仕様: specs/life-money-sim/save-result/requirements.md#テストデータの判定-1、specs/life-money-sim/save-result/requirements.md#テストデータの判定-2、specs/life-money-sim/save-result/requirements.md#テストデータの判定-3
describe('テストデータの判定 - 動作確認・テストによる保存かどうかを実行環境とURLから判定する', () => {
  it('開発サーバー(開発環境)で動かしている場合、テストデータと判定されること', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(isTestData()).toBe(true)
  })

  it('本番ビルドでも、URLにtest=1パラメータを付けて開いている場合、テストデータと判定されること', () => {
    vi.stubEnv('NODE_ENV', 'production')
    window.history.replaceState(null, '', '/life-money-sim/?test=1')
    expect(isTestData()).toBe(true)
  })

  it('本番ビルドでURLにパラメータがない場合、テストデータではないと判定されること', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(isTestData()).toBe(false)
  })
})

const baseInput: SaveResultInput = {
  hasSpouse: true,
  childrenCount: 1,
  monthlySalary: 35,
  personalExpenseMonthly: 8,
  householdExpenseTotal: 20,
  myHouseholdShare: 10,
  startingAsset: 300,
  investmentMode: true,
  expectedAnnualRate: 3,
  eventCount: 2,
  finalMonthAsset: 5000,
  monthlySurplus: 17,
}

// 仕様: specs/life-money-sim/save-result/requirements.md#機能要件-1、specs/life-money-sim/save-result/requirements.md#機能要件-2
describe('保存用レコードの組み立て - 入力・計算結果からdesign.mdのカラム定義どおりのレコードを組み立てる', () => {
  it('配偶者ありの資産運用モードのとき、家計支出合計・想定利回りを含めたレコードが組み立てられること', () => {
    expect(buildResultRecord(baseInput, false)).toEqual({
      has_spouse: true,
      children_count: 1,
      monthly_salary: 35,
      personal_expense_monthly: 8,
      household_expense_total: 20,
      my_household_share: 10,
      starting_asset: 300,
      investment_mode: true,
      expected_annual_rate: 3,
      event_count: 2,
      final_month_asset: 5000,
      monthly_surplus: 17,
      is_test: false,
    })
  })

  it('配偶者なし・貯蓄のみモードのとき、家計支出合計・自分の家計負担額・想定利回りがnullになること', () => {
    const input: SaveResultInput = { ...baseInput, hasSpouse: false, investmentMode: false }
    const record = buildResultRecord(input, true)
    expect(record.household_expense_total).toBeNull()
    expect(record.my_household_share).toBeNull()
    expect(record.expected_annual_rate).toBeNull()
    expect(record.is_test).toBe(true)
  })
})

// 仕様: specs/life-money-sim/save-result/requirements.md#機能要件-1
describe('life_money_sim_resultsテーブルへの保存 - 組み立てたレコードをSupabaseへinsertする', () => {
  it('組み立てたレコードが正しいテーブル名・カラム名でinsertされ、保存成功がtrueで返ること', async () => {
    await expect(saveResult(baseInput)).resolves.toBe(true)

    expect(fromMock).toHaveBeenCalledWith('life_money_sim_results')
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        has_spouse: true,
        starting_asset: 300,
        final_month_asset: 5000,
      })
    )
  })
})

// 仕様: specs/life-money-sim/save-result/requirements.md#エッジケース・例外処理-1
describe('保存失敗時の扱い - DBへの保存に失敗しても計算結果表示には影響させないが、呼び出し元は成功/失敗を判別できる', () => {
  it('Supabaseへの保存が例外を投げても、saveResultはエラーを外に投げずfalseで正常終了すること', async () => {
    insertMock.mockRejectedValue(new Error('network error'))
    await expect(saveResult(baseInput)).resolves.toBe(false)
  })

  it('Supabaseが例外を投げず{error}を返した場合(RLS拒否等)も、saveResultはfalseを返すこと', async () => {
    insertMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    await expect(saveResult(baseInput)).resolves.toBe(false)
  })
})
