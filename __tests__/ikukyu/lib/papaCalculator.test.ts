import { describe, it, expect } from 'vitest'
import {
  calcPaternityBenefit,
  calcPapaChildcare67,
  calcPapaChildcare50,
} from '../../../app/ikukyu/lib/calculator'

// leaveStartDate='2026-11-01', paternityDays=28 の各基準日:
//   産後パパ育休終了日 = leaveStartDate + 27日 = '2026-11-28'
//   通常育休開始日     = leaveStartDate + 28日 = '2026-11-29'
//   総育休180日目      = leaveStartDate + 179日 = '2027-04-29'
//   総育休181日目      = leaveStartDate + 180日 = '2027-04-30'（50%期間の開始日）

// 仕様: specs/ikukyu/simulator/design.md#給付金計算の概要（出生時育児休業給付金: 出生後8週以内・最大28日、日額×67%）
// 出生時育休の日額 = floor(min(賃金日額, 16110) × 67/100)
// bonusAmount     = floor(min(賃金日額, 16110) × 13/100) × 取得日数
// 賃金日額        = floor(monthlySalary / 30)
describe('【パパ】出生時育児休業給付金（産後パパ育休）の金額計算 - 月給と取得日数から給付額を算出する', () => {
  it('産後パパ育休を上限の28日間取得した場合、67%の給付金に加えて13%の上乗せ額（bonusAmount）が計算されること', () => {
    // 賃金日額 = floor(380000/30) = 12666円
    // 日額67% = floor(12666 × 67/100) = floor(8486.22) = 8486円
    // 日額13% = floor(12666 × 13/100) = floor(1646.58) = 1646円
    // amount     = 8486 × 28 = 237,608円
    // bonusAmount = 1646 × 28 = 46,088円
    const result = calcPaternityBenefit({ monthlySalary: 380000, dueDate: '2026-11-01' })
    expect(result.type).toBe('paternity')
    expect(result.source).toBe('雇用保険')
    expect(result.startDate).toBe('2026-11-01')
    expect(result.endDate).toBe('2026-11-28')
    expect(result.days).toBe(28)
    expect(result.amount).toBe(237608)
    expect(result.bonusAmount).toBe(46088)
    expect(result.dailyLimitReached).toBe(false)
  })

  it('産後パパ育休を14日間のみ取得した場合、取得日数分に短縮された給付額が返ること', () => {
    // endDate = dueDate + (14 - 1) = '2026-11-14'
    // amount     = 8486 × 14 = 118,804円
    // bonusAmount = 1646 × 14 = 23,044円
    const result = calcPaternityBenefit({ monthlySalary: 380000, dueDate: '2026-11-01', paternityDays: 14 })
    expect(result.endDate).toBe('2026-11-14')
    expect(result.days).toBe(14)
    expect(result.amount).toBe(118804)
    expect(result.bonusAmount).toBe(23044)
  })

  it('月給が高額（100万円）のとき、賃金日額の上限16,110円が適用されること', () => {
    // 賃金日額 = floor(1000000/30) = 33333円 → 上限16,110円にキャップ
    // 日額67% = floor(16110 × 67/100) = floor(10793.7) = 10793円
    // amount = 10793 × 28 = 302,204円
    const result = calcPaternityBenefit({ monthlySalary: 1000000, dueDate: '2026-11-01' })
    expect(result.dailyLimitReached).toBe(true)
    expect(result.amount).toBe(302204)
  })
})

// 仕様: specs/ikukyu/papa-birth-date/design.md#calcPapaChildcare67の変更
// 通常育休67%日額 = floor(min(賃金日額, 16110) × 67/100)
// 対象期間: 産後パパ育休終了後〜総育休180日目
// 総育休180日目を超える場合は180日目で打ち切る
describe('【パパ】育児休業給付金（前期67%）の金額計算 - 産後パパ育休終了後から育休180日目までの給付額を算出する', () => {
  it('育休終了予定日がちょうど育休180日目のとき、産後パパ育休終了後から180日目までの全期間が67%で計算されること', () => {
    // 通常育休開始: leaveStartDate+28 = '2026-11-29'
    // day180:       leaveStartDate+179 = '2027-04-29'
    // endDate = min(day180, leaveEndDate) = '2027-04-29'
    // 日数: '2026-11-29' 〜 '2027-04-29' = 152日
    // 日額67% = 8486円
    // amount = 8486 × 152 = 1,289,872円
    const result = calcPapaChildcare67({
      monthlySalary: 380000,
      leaveStartDate: '2026-11-01',
      paternityDays: 28,
      leaveEndDate: '2027-04-29',
    })
    expect(result).not.toBeNull()
    expect(result!.type).toBe('childcare67')
    expect(result!.source).toBe('雇用保険')
    expect(result!.startDate).toBe('2026-11-29')
    expect(result!.endDate).toBe('2027-04-29')
    expect(result!.days).toBe(152)
    expect(result!.amount).toBe(1289872)
    expect(result!.dailyLimitReached).toBe(false)
  })

  it('育休終了予定日が180日目を超える場合でも、67%給付は180日目（2027-04-29）で打ち切られること', () => {
    // 67%はleaveStartDate+179=2027-04-29 で打ち切り（翌日から50%）
    // 152日・amount = 8486 × 152 = 1,289,872円
    const result = calcPapaChildcare67({
      monthlySalary: 380000,
      leaveStartDate: '2026-11-01',
      paternityDays: 28,
      leaveEndDate: '2027-08-31',
    })
    expect(result!.endDate).toBe('2027-04-29')
    expect(result!.days).toBe(152)
    expect(result!.amount).toBe(1289872)
  })

  it('産後パパ育休を取得しなかった場合、育休開始日当日から67%給付が始まること', () => {
    // 産後パパ育休0日 → 通常育休はleaveStartDate当日から開始
    // startDate = leaveStartDate + 0 = '2026-11-01'
    // day180 = leaveStartDate + 179 = '2027-04-29'
    // leaveEndDate = '2027-04-29' → 180日間すべて67%
    const result = calcPapaChildcare67({
      monthlySalary: 380000,
      leaveStartDate: '2026-11-01',
      paternityDays: 0,
      leaveEndDate: '2027-04-29',
    })
    expect(result).not.toBeNull()
    expect(result!.startDate).toBe('2026-11-01')
    expect(result!.days).toBe(180)
  })

  it('育休終了予定日が産後パパ育休の期間内で終わる場合、前期67%の給付なし（null）が返ること', () => {
    // leaveEndDate = leaveStartDate+27 で、産後パパ育休期間と同じ
    // 通常育休の startDate = leaveStartDate+28 > leaveEndDate → null
    const result = calcPapaChildcare67({
      monthlySalary: 380000,
      leaveStartDate: '2026-11-01',
      paternityDays: 28,
      leaveEndDate: '2026-11-28',
    })
    expect(result).toBeNull()
  })
})

// 仕様: specs/ikukyu/papa-birth-date/design.md#calcPapaChildcare50の変更
// 通常育休50%日額 = floor(min(賃金日額, 16110) × 50/100)
// 対象期間: 総育休181日目〜育休終了予定日
// 総育休が180日以内の場合は null を返す
describe('【パパ】育児休業給付金（後期50%）の金額計算 - 育休181日目以降の給付額を算出する', () => {
  it('育休終了予定日が181日目より後のとき、181日目から育休終了日までの50%給付額が計算されること', () => {
    // 50%開始日 = leaveStartDate+180 = '2027-04-30'
    // 対象日数: '2027-04-30' 〜 '2027-08-31' = 124日
    //   (Apr:1, May:31, Jun:30, Jul:31, Aug:31 = 124日)
    // 日額50% = floor(12666 × 50/100) = floor(6333) = 6333円
    // amount = 6333 × 124 = 785,292円
    const result = calcPapaChildcare50({
      monthlySalary: 380000,
      leaveStartDate: '2026-11-01',
      paternityDays: 28,
      leaveEndDate: '2027-08-31',
    })
    expect(result).not.toBeNull()
    expect(result!.type).toBe('childcare50')
    expect(result!.source).toBe('雇用保険')
    expect(result!.startDate).toBe('2027-04-30')
    expect(result!.endDate).toBe('2027-08-31')
    expect(result!.days).toBe(124)
    expect(result!.amount).toBe(785292)
  })

  it('育休期間が180日以内で後期50%の対象日が存在しない場合、給付なし（null）が返ること', () => {
    // 50%開始日 = leaveStartDate+180 = '2027-04-30' > '2027-04-29' = leaveEndDate
    const result = calcPapaChildcare50({
      monthlySalary: 380000,
      leaveStartDate: '2026-11-01',
      paternityDays: 28,
      leaveEndDate: '2027-04-29',
    })
    expect(result).toBeNull()
  })
})
