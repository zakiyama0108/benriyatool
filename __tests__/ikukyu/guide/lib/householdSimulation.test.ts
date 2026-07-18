import { describe, it, expect } from 'vitest'
import { HOUSEHOLD_MODEL, comparePatterns, simulateHousehold } from '../../../../app/ikukyu/guide/lib/householdSimulation'
import { calcMamaChildcare67, calcMaternityBenefit, calcPaternityBenefit } from '../../../../app/ikukyu/lib/calculator'

// 世帯モデル: 夫 月給35万円・妻 月給28万円、出産予定日2026-10-01、ママ育休は2027-09-30まで
// パターンA: ママのみ育休 / B: ママ+パパ28日 / C: ママ+パパ14日(同時期はママ産休)

// 仕様: specs/ikukyu/guide/requirements.md#出生後休業支援給付金の計上条件-2
describe('世帯シミュレーションのパターンA(ママのみ育休) - 配偶者の取得要件を満たさないため上乗せを計上しない', () => {
  it('パターンAでは、夫婦どちらにも出生後休業支援給付金の上乗せが計上されないこと', () => {
    const result = simulateHousehold('A')
    expect(result.bonusTotal.mama).toBe(0)
    expect(result.bonusTotal.papa).toBe(0)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#出生後休業支援給付金の計上条件-1、specs/ikukyu/guide/requirements.md#出生後休業支援給付金の計上条件-3
describe('世帯シミュレーションのパターンB・C - 夫婦それぞれ14日以上の要件を満たすため双方に上乗せを計上する', () => {
  it('パターンB(パパ28日)では、パパに28日分・ママに最大28日分の上乗せが計上されること', () => {
    const result = simulateHousehold('B')
    const papa28 = calcPaternityBenefit({ monthlySalary: HOUSEHOLD_MODEL.papaSalary, dueDate: HOUSEHOLD_MODEL.dueDate, paternityDays: 28 })
    const mamaC67 = calcMamaChildcare67({ monthlySalary: HOUSEHOLD_MODEL.mamaSalary, dueDate: HOUSEHOLD_MODEL.dueDate, leaveEndDate: HOUSEHOLD_MODEL.mamaLeaveEndDate })
    expect(result.bonusTotal.papa).toBe(papa28.bonusAmount)
    expect(result.bonusTotal.mama).toBe(mamaC67.bonusAmount)
  })

  it('パターンC(パパ14日)では、パパの上乗せが14日分に減り、ママの上乗せは最大28日分のまま計上されること', () => {
    const result = simulateHousehold('C')
    const papa14 = calcPaternityBenefit({ monthlySalary: HOUSEHOLD_MODEL.papaSalary, dueDate: HOUSEHOLD_MODEL.dueDate, paternityDays: 14 })
    const mamaC67 = calcMamaChildcare67({ monthlySalary: HOUSEHOLD_MODEL.mamaSalary, dueDate: HOUSEHOLD_MODEL.dueDate, leaveEndDate: HOUSEHOLD_MODEL.mamaLeaveEndDate })
    expect(result.bonusTotal.papa).toBe(papa14.bonusAmount)
    expect(result.bonusTotal.mama).toBe(mamaC67.bonusAmount)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事3: 夫婦育休の世帯収入シミュレーション(`/ikukyu/guide/fufu-ikukyu/`)-1
describe('世帯シミュレーションの月次集計 - 給付の日割り配分と就労手取りの合算で月次推移を組み立てる', () => {
  it('どのパターンでも、各月の世帯収入が夫婦それぞれの収入の合計になり、累計が全月の合計と一致すること', () => {
    for (const pattern of ['A', 'B', 'C'] as const) {
      const result = simulateHousehold(pattern)
      for (const row of result.rows) {
        expect(row.papa + row.mama).toBe(row.total)
      }
      expect(result.rows.reduce((sum, row) => sum + row.total, 0)).toBe(result.total)
    }
  })

  it('試算期間が産休開始月(2026年8月)からママ育休終了月(2027年9月)までであること', () => {
    const result = simulateHousehold('A')
    expect(result.rows[0].month).toBe('2026-08')
    expect(result.rows[result.rows.length - 1].month).toBe('2027-09')
  })

  it('パターンAの2026年10月は、ママが出産手当金の31日分の日割り・パパが就労手取り(概算)の満額になること', () => {
    // 出産手当金は98日分の総額を日割りし、10月は丸ごと産休期間のため31日分を計上する
    const result = simulateHousehold('A')
    const october = result.rows.find((row) => row.month === '2026-10')!
    const maternity = calcMaternityBenefit({ monthlySalary: HOUSEHOLD_MODEL.mamaSalary, dueDate: HOUSEHOLD_MODEL.dueDate })
    expect(october.mama).toBe((maternity.amount / maternity.days) * 31)
    expect(october.papa).toBe(HOUSEHOLD_MODEL.papaSalary * 0.8)
  })

  it('パターンBの2026年10月は、パパが「産後パパ育休28日分(上乗せ含む)+残り3日分の就労手取り日割り」になること', () => {
    // パパは10/1〜10/28が育休(給付は発生ベースで10月に全額計上)、10/29〜31の3日だけ就労
    const result = simulateHousehold('B')
    const october = result.rows.find((row) => row.month === '2026-10')!
    const papa28 = calcPaternityBenefit({ monthlySalary: HOUSEHOLD_MODEL.papaSalary, dueDate: HOUSEHOLD_MODEL.dueDate, paternityDays: 28 })
    const workingPart = Math.round(HOUSEHOLD_MODEL.papaSalary * 0.8 * (3 / 31))
    expect(october.papa).toBe(papa28.amount + (papa28.bonusAmount ?? 0) + workingPart)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事3: 夫婦育休の世帯収入シミュレーション(`/ikukyu/guide/fufu-ikukyu/`)-2
describe('世帯シミュレーションのパターン間差額 - 「パパが取っても世帯手取りはほぼ減らない」を実額で示す', () => {
  it('パターンB(パパ28日)の世帯累計が、パターンA(ママのみ)を下回らないこと(ママの上乗せ発生+給付80%≒就労手取りのため)', () => {
    const { totals } = comparePatterns()
    expect(totals.B).toBeGreaterThanOrEqual(totals.A)
  })

  it('3パターンの累計と、Aとの差額が算出できること', () => {
    const { totals, diffFromA } = comparePatterns()
    expect(diffFromA.B).toBe(totals.B - totals.A)
    expect(diffFromA.C).toBe(totals.C - totals.A)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#数値の算出元-3
describe('世帯シミュレーションの安全装置 - 想定外の入力・結果で例外を投げてビルドを止める', () => {
  it('月給が不正な世帯モデルを渡した場合、例外になること(ビルド失敗ガード)', () => {
    expect(() => simulateHousehold('A', { ...HOUSEHOLD_MODEL, papaSalary: -1 })).toThrow()
    expect(() => simulateHousehold('B', { ...HOUSEHOLD_MODEL, mamaSalary: 0 })).toThrow()
  })
})
