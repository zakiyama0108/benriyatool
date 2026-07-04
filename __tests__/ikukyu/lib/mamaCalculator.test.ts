import { describe, it, expect } from 'vitest'
import {
  calcMaternityBenefit,
  calcMamaChildcare67,
  calcMamaChildcare50,
} from '../../../app/ikukyu/lib/calculator'

// 仕様: specs/ikukyu/simulator/requirements.md#出産手当金（産前42日〜産後56日、日額の3分の2）
// 出産手当金の日額 = floor(monthlySalary / 30 * 2/3)
// 上限日額 = 30,887円（標準報酬月額上限 139万円 ÷ 30 × 2/3 の定数）
describe('【ママ】出産手当金の金額計算 - 月給と出産予定日から産前産後98日分の給付額を算出する', () => {
  // 出産予定日2026-11-01の産前・産後期間:
  //   startDate = getMaternityStartDate('2026-11-01') = '2026-09-21'（出産予定日 - 41日）
  //   endDate   = getPostnatalEndDate('2026-11-01')   = '2026-12-27'（出産予定日 + 56日）
  //   日数 = 42 + 56 = 98日
  it('月給32万円のとき、産前産後98日分の出産手当金が正しく計算されること', () => {
    // 日額 = floor(320000 / 30 * 2/3) = floor(7111.11) = 7111円
    // 合計 = 7111 × 98 = 696,878円
    const result = calcMaternityBenefit({ monthlySalary: 320000, dueDate: '2026-11-01' })
    expect(result.type).toBe('maternity')
    expect(result.source).toBe('健康保険')
    expect(result.days).toBe(98)
    expect(result.startDate).toBe('2026-09-21')
    expect(result.endDate).toBe('2026-12-27')
    expect(result.amount).toBe(696878)
    expect(result.dailyLimitReached).toBe(false)
  })

  it('月給が高額（150万円）のとき、日額に上限30,887円が適用され上限到達フラグが立つこと', () => {
    // 計算日額 = floor(1500000 / 30 * 2/3) = floor(33333.33) = 33333円 → 上限30,887円に切り下げ
    // 合計 = 30887 × 98 = 3,026,926円
    const result = calcMaternityBenefit({ monthlySalary: 1500000, dueDate: '2026-11-01' })
    expect(result.dailyLimitReached).toBe(true)
    expect(result.amount).toBe(3026926)
    expect(result.days).toBe(98)
  })
})

// 仕様: specs/ikukyu/simulator/requirements.md#育児休業給付金・前期67%（育休開始〜180日目）
// 育休前期67%の日額 = floor(min(賃金日額, 16110) × 67/100)
// 賃金日額 = floor(monthlySalary / 30)
// 上限: 賃金日額 16,110円（67%後: 10,793円/日）
describe('【ママ】育児休業給付金（前期67%）の金額計算 - 育休開始日から180日目までの給付額を算出する', () => {
  // 出産予定日2026-11-01の育休開始日:
  //   leaveStart = getMamaLeaveStartDate('2026-11-01') = '2026-12-28'（出産予定日 + 57日）
  //   育休180日目 = '2026-12-28' + 179日 = '2027-06-25'
  it('月給32万円で育休終了予定日が180日目より後のとき、育休1〜180日目分の67%給付額が計算されること', () => {
    // 賃金日額 = floor(320000/30) = 10666円
    // 日額67% = floor(10666 × 67/100) = floor(7146.22) = 7146円
    // 180日分 = 7146 × 180 = 1,286,280円
    const result = calcMamaChildcare67({
      monthlySalary: 320000,
      dueDate: '2026-11-01',
      leaveEndDate: '2027-10-31',
    })
    expect(result.type).toBe('childcare67')
    expect(result.source).toBe('雇用保険')
    expect(result.days).toBe(180)
    expect(result.startDate).toBe('2026-12-28')
    expect(result.endDate).toBe('2027-06-25')
    expect(result.amount).toBe(1286280)
    expect(result.dailyLimitReached).toBe(false)
  })

  it('月給が高額（100万円）のとき、賃金日額の上限16,110円が適用され上限到達フラグが立つこと', () => {
    // 賃金日額 = floor(1000000/30) = 33333円 → 上限16,110円に切り下げ
    // 日額67% = floor(16110 × 67/100) = floor(10793.7) = 10793円
    // 180日分 = 10793 × 180 = 1,942,740円
    const result = calcMamaChildcare67({
      monthlySalary: 1000000,
      dueDate: '2026-11-01',
      leaveEndDate: '2027-10-31',
    })
    expect(result.dailyLimitReached).toBe(true)
    expect(result.amount).toBe(1942740)
  })
})

// 仕様: specs/ikukyu/simulator/requirements.md#育児休業給付金・前期67%（出生後休業支援給付金の13%上乗せ）
// 出生後休業支援給付金 +13% は育休1〜28日目に加算（bonusAmount として別出し）
describe('【ママ】出生後休業支援給付金（67%への13%上乗せ）の金額計算 - 育休1〜28日目の上乗せ額を算出する', () => {
  it('育休1〜28日目にあたる産後57〜84日目の期間について、13%の上乗せ額（bonusAmount）が計算されること', () => {
    // 賃金日額 = floor(320000/30) = 10666円
    // 日額13% = floor(10666 × 13/100) = floor(1386.58) = 1386円
    // 28日分 = 1386 × 28 = 38,808円
    const result = calcMamaChildcare67({
      monthlySalary: 320000,
      dueDate: '2026-11-01',
      leaveEndDate: '2027-10-31',
    })
    expect(result.bonusAmount).toBe(38808)
  })
})

// 仕様: specs/ikukyu/simulator/requirements.md#育児休業給付金・後期50%（181日目以降〜育休終了）
// 育休後期50%の日額 = floor(賃金日額 × 50/100)
// 育休181日目〜育休終了日が対象。育休が180日以内なら null を返す
describe('【ママ】育児休業給付金（後期50%）の金額計算 - 育休181日目以降の給付額を算出する', () => {
  it('育休終了予定日が181日目より後のとき、181日目から育休終了日までの50%給付額が計算されること', () => {
    // 育休181日目 = '2026-12-28' + 180日 = '2027-06-26'
    // 対象日数: 2027-06-26〜2027-10-31 = 128日
    //   (Jun:5, Jul:31, Aug:31, Sep:30, Oct:31 = 128日)
    // 賃金日額 = 10666円
    // 日額50% = floor(10666 × 50/100) = floor(5333) = 5333円
    // 合計 = 5333 × 128 = 682,624円
    const result = calcMamaChildcare50({
      monthlySalary: 320000,
      dueDate: '2026-11-01',
      leaveEndDate: '2027-10-31',
    })
    expect(result).not.toBeNull()
    expect(result!.type).toBe('childcare50')
    expect(result!.source).toBe('雇用保険')
    expect(result!.startDate).toBe('2027-06-26')
    expect(result!.endDate).toBe('2027-10-31')
    expect(result!.days).toBe(128)
    expect(result!.amount).toBe(682624)
  })

  it('育休期間が180日以内で後期50%の対象日が存在しない場合、給付なし（null）が返ること', () => {
    // 育休終了予定日='2027-05-31': 育休期間 2026-12-28〜2027-05-31 = 155日 (< 180日)
    const result = calcMamaChildcare50({
      monthlySalary: 320000,
      dueDate: '2026-11-01',
      leaveEndDate: '2027-05-31',
    })
    expect(result).toBeNull()
  })
})
