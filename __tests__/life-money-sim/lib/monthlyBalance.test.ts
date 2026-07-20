import { describe, it, expect } from 'vitest'
import {
  calcPersonalExpenseMonthly,
  calcMonthlySurplus,
  calcAnnualSurplus,
  calcExpenseRatio,
} from '../../../app/life-money-sim/lib/monthlyBalance'
import type { ExpenseItem } from '../../../app/life-money-sim/lib/types'

// 仕様: specs/life-money-sim/monthly-balance/requirements.md#個人支出-3、specs/life-money-sim/monthly-balance/requirements.md#ビジネスルール・制約-1
describe('個人支出の月合計の計算 - 年額固定費を月換算した金額と月額固定費を合算する', () => {
  it('年額固定費・月額固定費のどちらも0件のとき、個人支出の月合計は0になること', () => {
    expect(calcPersonalExpenseMonthly([], [])).toBe(0)
  })

  it('年額固定費が複数件、月額固定費が複数件あるとき、年額合計を12で割った額と月額合計を足した値になること', () => {
    const annualItems: ExpenseItem[] = [
      { name: '旅行', amount: 24 },
      { name: '車検', amount: 12 },
    ]
    const monthlyItems: ExpenseItem[] = [
      { name: '習い事', amount: 1 },
      { name: 'サブスク', amount: 0.5 },
    ]
    // 年額合計36万円 / 12 = 3万円、月額合計1.5万円 → 4.5万円
    expect(calcPersonalExpenseMonthly(annualItems, monthlyItems)).toBeCloseTo(4.5)
  })
})

// 仕様: specs/life-money-sim/monthly-balance/design.md#バリデーション
describe('内訳金額のバリデーション - 不正な金額の内訳項目は0として計算する', () => {
  it('金額が負数の内訳項目は0として扱われること', () => {
    const annualItems: ExpenseItem[] = [{ name: '不正', amount: -12 }]
    expect(calcPersonalExpenseMonthly(annualItems, [])).toBe(0)
  })

  it('金額が数値以外(NaN)の内訳項目は0として扱われること', () => {
    const monthlyItems: ExpenseItem[] = [{ name: '空欄入力', amount: NaN }]
    expect(calcPersonalExpenseMonthly([], monthlyItems)).toBe(0)
  })
})

// 仕様: specs/life-money-sim/monthly-balance/requirements.md#余剰資金の計算-1、specs/life-money-sim/monthly-balance/requirements.md#家計支出(配偶者がいる場合)-1
describe('月次余剰資金(賞与抜き)の計算 - 手取り月給から個人支出と家計負担額を差し引く', () => {
  it('配偶者なしの場合、家計負担額は0として計算されること', () => {
    // 30万円 - 個人支出5万円 - 家計負担0万円 = 25万円
    expect(calcMonthlySurplus(30, 5, false, 10)).toBe(25)
  })

  it('配偶者ありの場合、入力された家計負担額がそのまま差し引かれること', () => {
    // 30万円 - 個人支出5万円 - 家計負担10万円 = 15万円
    expect(calcMonthlySurplus(30, 5, true, 10)).toBe(15)
  })
})

// 仕様: specs/life-money-sim/monthly-balance/requirements.md#余剰資金の計算-2
describe('年間余剰資金の計算 - 月次余剰資金を12倍しボーナスの年間合計を足す', () => {
  it('月次余剰資金×12にボーナス年間合計(回数×1回あたり金額)を足した値が返ること', () => {
    // 月次余剰資金15万円×12 + ボーナス(年2回×20万円) = 180+40 = 220万円
    expect(calcAnnualSurplus(15, 2, 20)).toBe(220)
  })
})

// 仕様: specs/life-money-sim/monthly-balance/requirements.md#余剰資金の計算-4
describe('支出割合の計算 - 支出合計が手取り月給に占める割合を示す', () => {
  it('支出合計(個人支出の月合計+自分の家計負担額)を手取り月給で割った割合が返ること', () => {
    // 支出合計(5+10=15万円) / 手取り月給30万円 = 0.5
    expect(calcExpenseRatio(5, true, 10, 30)).toBeCloseTo(0.5)
  })

  it('手取り月給が0の場合は「算出対象なし」を表すnullが返ること', () => {
    expect(calcExpenseRatio(5, false, 0, 0)).toBeNull()
  })
})
