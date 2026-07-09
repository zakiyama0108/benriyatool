import { describe, it, expect } from 'vitest'
import { calcResult } from '../../../app/ikukyu/lib/calculator'

// 仕様: specs/ikukyu/simulator/requirements.md#出産手当金-4、specs/ikukyu/simulator/requirements.md#育児休業給付金・前期67%-4、specs/ikukyu/simulator/requirements.md#育児休業給付金・後期50%-4
// calcResult は入力からすべての給付金をまとめて計算する結果画面の中核処理
describe('【ママ・パパ共通】結果画面全体の給付金計算 - 月給が高額な場合に各給付金の上限適用が正しく反映されること', () => {
  it('ママモードで月給50万円のとき、出産手当金は上限未達のまま、育休給付金（前期・後期）は上限到達として計算されること', () => {
    // wageDaily = floor(500000/30) = 16666 > 16110 → dailyLimitReached: true
    const result = calcResult({
      mode: 'mama',
      monthlySalary: 500000,
      dueDate: '2026-11-01',
      leaveEndDate: '2027-10-31',
    })
    // 出産手当金（健保）: floor(500000/30*2/3) = 11111 < 30887 → 上限未達
    expect(result.benefits[0].type).toBe('maternity')
    expect(result.benefits[0].dailyLimitReached).toBe(false)
    // 育休67%（雇用保険）: 上限到達
    expect(result.benefits[1].type).toBe('childcare67')
    expect(result.benefits[1].dailyLimitReached).toBe(true)
    // 育休50%（雇用保険）: 上限到達
    expect(result.benefits[2].type).toBe('childcare50')
    expect(result.benefits[2].dailyLimitReached).toBe(true)
  })

  it('パパモードで月給50万円のとき、すべての給付金で上限到達フラグが立つこと', () => {
    const result = calcResult({
      mode: 'papa',
      monthlySalary: 500000,
      dueDate: '2026-11-01',
      leaveStartDate: '2026-11-01',
      leaveEndDate: '2027-04-29',
    })
    expect(result.benefits.every(b => b.dailyLimitReached)).toBe(true)
  })
})

// 仕様: specs/ikukyu/simulator/requirements.md#エッジケース・例外処理-1、specs/ikukyu/simulator/requirements.md#育児休業給付金・後期50%-2
describe('【ママ・パパ共通】結果画面全体の給付金計算 - 育休期間が短い場合に後期給付金が発生しないこと', () => {
  it('ママモードで育休期間が14日間しかない場合、上乗せ額（bonusAmount）は14日分にとどまり、後期50%の給付金は発生しないこと', () => {
    // leaveStart = 2026-12-28, leaveEnd = 2027-01-10（14日間）
    const result = calcResult({
      mode: 'mama',
      monthlySalary: 320000,
      dueDate: '2026-11-01',
      leaveEndDate: '2027-01-10',
    })
    const c67 = result.benefits.find(b => b.type === 'childcare67')!
    expect(c67.days).toBe(14)
    // bonusDays = min(28, 14) = 14。日額13% = floor(10666 × 13/100) = 1386円
    expect(c67.bonusAmount).toBe(Math.floor(Math.floor(320000 / 30) * 13 / 100) * 14)
    expect(result.benefits.find(b => b.type === 'childcare50')).toBeUndefined()
  })

  it('パパモードで産後パパ育休の期間だけで育休を終える場合、通常育休（前期67%・後期50%）の給付金は発生しないこと', () => {
    // leaveStartDate + 27 = '2026-11-28' = 産後パパ育休終了日と同じ = 通常育休なし
    const result = calcResult({
      mode: 'papa',
      monthlySalary: 380000,
      dueDate: '2026-11-01',
      leaveStartDate: '2026-11-01',
      leaveEndDate: '2026-11-28',
    })
    expect(result.benefits.find(b => b.type === 'paternity')).toBeDefined()
    expect(result.benefits.find(b => b.type === 'childcare67')).toBeUndefined()
    expect(result.benefits.find(b => b.type === 'childcare50')).toBeUndefined()
  })
})

// 仕様: specs/ikukyu/simulator/requirements.md#育児休業給付金・後期50%-2
describe('【パパ】結果画面全体の給付金計算 - 育休期間が180日を超える場合に後期50%給付金が発生すること', () => {
  it('育休終了予定日が総育休181日目以降になる場合、後期50%の給付金が正しい期間で発生すること', () => {
    // leaveStartDate + 180 = '2027-04-30' が childcare50 の開始日
    const result = calcResult({
      mode: 'papa',
      monthlySalary: 380000,
      dueDate: '2026-11-01',
      leaveStartDate: '2026-11-01',
      leaveEndDate: '2027-06-30',
    })
    const c50 = result.benefits.find(b => b.type === 'childcare50')
    expect(c50).toBeDefined()
    expect(c50!.startDate).toBe('2027-04-30')
    expect(c50!.endDate).toBe('2027-06-30')
  })
})

// 仕様: specs/ikukyu/simulator/requirements.md#産後パパ育休の取得可能日数の決定-2、specs/ikukyu/simulator/requirements.md#産後パパ育休の取得可能日数の決定-3
describe('【パパ】結果画面全体の給付金計算 - 育休開始日が出生後8週間の対象期間を過ぎている場合の扱いを確認する', () => {
  it('育休開始日が出生後8週間の対象期間を過ぎている場合、産後パパ育休の給付金は発生せず通常育休給付金のみが育休開始日から計算されること', () => {
    // 出産予定日 = '2026-11-01', 育休開始日 = '2027-01-01'（61日後）
    // 8週間の終了日 = 出産予定日+56 = '2026-12-27'
    // 育休開始日='2027-01-01' > '2026-12-27' → paternityDays=0
    const result = calcResult({
      mode: 'papa',
      monthlySalary: 380000,
      dueDate: '2026-11-01',
      leaveStartDate: '2027-01-01',
      leaveEndDate: '2027-06-30',
    })
    expect(result.benefits.find(b => b.type === 'paternity')).toBeUndefined()
    expect(result.benefits.find(b => b.type === 'childcare67')).toBeDefined()
    // 通常育休は育休開始日からそのまま始まる
    expect(result.benefits.find(b => b.type === 'childcare67')!.startDate).toBe('2027-01-01')
  })

  it('育休開始日が出生後8週間の対象期間の終盤（残り6日）にある場合、産後パパ育休は残り日数分（6日）だけ計算され、その翌日から通常育休が始まること', () => {
    // 出産予定日 = '2026-11-01', 育休開始日 = '2026-12-22'（出産予定日+51日）
    // 8週間の対象終了日 = 出産予定日+56 = '2026-12-27'
    // 残り日数 = countDays('2026-12-22', '2026-12-27') = 6日
    // paternityDays = min(28, 6, 総日数) = 6
    const result = calcResult({
      mode: 'papa',
      monthlySalary: 380000,
      dueDate: '2026-11-01',
      leaveStartDate: '2026-12-22',
      leaveEndDate: '2027-06-30',
    })
    const paternity = result.benefits.find(b => b.type === 'paternity')
    expect(paternity).toBeDefined()
    expect(paternity!.days).toBe(6)
    // 通常育休は産後パパ育休の翌日（+6日）である '2026-12-28' から始まる
    const c67 = result.benefits.find(b => b.type === 'childcare67')
    expect(c67!.startDate).toBe('2026-12-28')
  })
})
