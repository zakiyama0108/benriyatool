import { describe, it, expect } from 'vitest'
import { calcSummaryLabel, calcBreakdownBar, calcPaymentSchedules } from '../../../app/ikukyu/lib/calculator'
import type { BenefitItem } from '../../../app/ikukyu/lib/types'

// 仕様: specs/ikukyu/simulator/requirements.md#WHAT（産休〜育休を通じた給付金の総額・内訳を表示する）
describe('【ママ・パパ共通】結果画面の合計金額見出し生成 - モードに応じた見出し文言を出し分ける', () => {
  it('ママモードのとき、「出産手当金 + 育児休業給付金の合計」という見出しになること', () => {
    expect(calcSummaryLabel('mama')).toBe('出産手当金 + 育児休業給付金の合計')
  })

  it('パパモードのとき、「出生時育児休業給付金 + 育児休業給付金の合計」という見出しになること', () => {
    expect(calcSummaryLabel('papa')).toBe('出生時育児休業給付金 + 育児休業給付金の合計')
  })
})

// 仕様: specs/ikukyu/papa-birth-date/design.md#calcBreakdownBarの変更
// BreakdownBar の期待値:
//   mama 出産予定日='2026-11-01', 育休終了予定日='2027-10-31':
//     産休:     getMaternityStartDate('2026-11-01') ~ getPostnatalEndDate('2026-11-01') = 98日
//     育休67%:  getMamaLeaveStartDate('2026-11-01')='2026-12-28' + 180日目 = '2027-06-25' = 180日
//     育休50%:  '2027-06-26' ~ '2027-10-31' = 128日
//
//   papa 出産予定日='2026-11-01', 育休終了予定日='2027-04-29'（総育休180日目）:
//     産後パパ育休: '2026-11-01' ~ '2026-11-28' = 28日
//     育休67%:     '2026-11-29' ~ '2027-04-29' = 152日
//     ※ 育休終了予定日='2027-04-29'=総育休180日目 なので後期50%は発生しない
describe('【ママ・パパ共通】結果画面の内訳バー生成 - 産休・育休の各期間を区分ごとの日数で表示する', () => {
  it('ママモードのとき、産休・育休前期・育休後期の3区分が日数付きで表示されること', () => {
    const result = calcBreakdownBar({ mode: 'mama', dueDate: '2026-11-01', leaveEndDate: '2027-10-31' })
    expect(result).toHaveLength(3)
    expect(result[0].label).toBe('産休')
    expect(result[0].days).toBe(98)
    expect(result[1].label).toBe('育休（前期）')
    expect(result[1].days).toBe(180)
    expect(result[2].label).toBe('育休（後期）')
    expect(result[2].days).toBe(128)
  })

  it('パパモードで育休が180日以内に収まる場合、産後パパ育休・育休前期の2区分のみ表示され後期区分は出ないこと', () => {
    // 出産予定日と育休開始日が同日（出産当日から休むケース）
    const result = calcBreakdownBar({ mode: 'papa', dueDate: '2026-11-01', leaveStartDate: '2026-11-01', leaveEndDate: '2027-04-29' })
    expect(result).toHaveLength(2)
    expect(result[0].label).toBe('産後パパ育休')
    expect(result[0].days).toBe(28)
    expect(result[1].label).toBe('育休（前期）')
    expect(result[1].days).toBe(152)
  })
})

// 仕様: specs/ikukyu/simulator/requirements.md#スコープ（各給付金の振込スケジュール（2ヶ月ごと））
// PaymentSchedule の期待値:
//   childcare67: '2026-12-28' ~ '2027-06-25' (180日)
//   splitIntoTwoMonthBlocks で3ブロックに分割:
//     Block 1: '2026-12-28' ~ '2027-02-27'  終了月2027-02 +2ヶ月 → "2027年4月中旬ごろ"
//     Block 2: '2027-02-28' ~ '2027-04-27'  終了月2027-04 +2ヶ月 → "2027年6月中旬ごろ"
//     Block 3: '2027-04-28' ~ '2027-06-25'  終了月2027-06 +2ヶ月 → "2027年8月中旬ごろ"（最終）
describe('【ママ・パパ共通】振込スケジュール表示 - 給付金を2ヶ月ごとの振込予定月と金額に分けて表示する', () => {
  const childcare67: BenefitItem = {
    type: 'childcare67',
    officialName: '育児休業（育休）最初の180日',
    source: '雇用保険',
    startDate: '2026-12-28',
    endDate: '2027-06-25',
    days: 180,
    rateLabel: '休業前賃金の67%',
    amount: 1286280,
    bonusAmount: 38808,
    dailyLimitReached: false,
  }

  it('各振込ブロックについて、区分終了月の2ヶ月後・中旬ごろという振込予定月が表示されること', () => {
    const schedules = calcPaymentSchedules([childcare67])
    expect(schedules[0].estimatedPaymentMonth).toBe('2027年4月中旬ごろ')
    expect(schedules[1].estimatedPaymentMonth).toBe('2027年6月中旬ごろ')
    expect(schedules[2].estimatedPaymentMonth).toBe('2027年8月中旬ごろ')
  })

  it('最後の振込ブロックには「最終振込」であることを示すフラグが立つこと', () => {
    const schedules = calcPaymentSchedules([childcare67])
    const last = schedules[schedules.length - 1]
    expect(last.isFinal).toBe(true)
  })

  it('出生後休業支援給付金の上乗せ額（bonusAmount）は、最初の振込ブロックの金額にまとめて上乗せされること', () => {
    // 出生後休業支援給付金は育児休業給付金と同時に支払われるため最初のブロックに加算する
    // dailyRate = floor(1286280 / 180) = 7146
    // Block 1: '2026-12-28' ~ '2027-02-27' = 62日 → 7146×62 + 38808 = 481,860
    // Block 2: '2027-02-28' ~ '2027-04-27' = 59日 → 7146×59 = 421,614（bonus なし）
    const schedules = calcPaymentSchedules([childcare67])
    expect(schedules[0].amount).toBe(7146 * 62 + 38808)
    expect(schedules[1].amount).toBe(7146 * 59)
  })

  it('上乗せ額がない給付金の場合、振込ブロックの金額が変化しないこと', () => {
    const noBonus: BenefitItem = { ...childcare67, bonusAmount: undefined }
    const schedules = calcPaymentSchedules([noBonus])
    expect(schedules[0].amount).toBe(7146 * 62)
  })
})
