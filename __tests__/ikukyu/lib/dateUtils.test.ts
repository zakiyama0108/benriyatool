import { describe, it, expect } from 'vitest'
import {
  getMaternityStartDate,
  getPostnatalEndDate,
  getMamaLeaveStartDate,
  getPapaPaternityLeaveEndDate,
  getPapaLeaveStartDate,
  splitIntoTwoMonthBlocks,
} from '../../../app/ikukyu/lib/dateUtils'

// 仕様: specs/ikukyu/simulator/requirements.md#出産手当金（産前42日〜産後56日）
// 産前42日は出産予定日を含む42日間なので「出産予定日 - 41日」で開始日を算出する
describe('【ママ】出産手当金の対象期間計算 - 産前休業がいつから始まるかを出産予定日から算出する', () => {
  it('出産予定日が2026年11月1日のとき、42日前の2026年9月21日から産前休業が始まること', () => {
    expect(getMaternityStartDate('2026-11-01')).toBe('2026-09-21')
  })

  // 2月は28日しかないため、月境界で日数がずれないことを確認する
  it('計算区間に日数の少ない2月を含む場合でも、日数がずれずに正しい開始日になること', () => {
    expect(getMaternityStartDate('2026-03-01')).toBe('2026-01-19')
  })

  // 1月初旬の予定日は前年12月にまたがるため、年をまたぐ処理を確認する
  it('出産予定日が1月中旬で前年にまたがる場合でも、正しい開始日になること', () => {
    expect(getMaternityStartDate('2027-01-15')).toBe('2026-12-05')
  })
})

// 仕様: specs/ikukyu/simulator/requirements.md#出産手当金（産前42日〜産後56日）
// 産後56日は出産翌日を1日目として56日間なので「出産予定日 + 56日」で終了日を算出する
describe('【ママ】出産手当金の対象期間計算 - 産後休業がいつ終わるかを出産予定日から算出する', () => {
  it('出産予定日が2026年11月1日のとき、56日後の2026年12月27日に産後休業が終わること', () => {
    expect(getPostnatalEndDate('2026-11-01')).toBe('2026-12-27')
  })

  // 11月は30日しかないため、年をまたぐ処理を確認する
  it('計算区間が年末をまたぐ場合でも、翌年の正しい終了日になること', () => {
    expect(getPostnatalEndDate('2026-11-10')).toBe('2027-01-05')
  })
})

// 仕様: specs/ikukyu/simulator/requirements.md#育児休業給付金・前期67%（育休開始〜180日目）
// ママの育休は産後休業終了日の翌日から開始するため「産後終了日 + 1日」で算出する
describe('【ママ】産休から育休への切り替わり日計算 - 産後休業終了の翌日を育休開始日とする', () => {
  it('出産予定日が2026年11月1日のとき、産後休業終了の翌日である2026年12月28日から育休が始まること', () => {
    expect(getMamaLeaveStartDate('2026-11-01')).toBe('2026-12-28')
  })

  // 産後終了日が12/31になる場合、育休開始は翌年1/1になることを確認する
  it('産後休業の終了日がちょうど大晦日になる場合でも、翌年1月1日から育休が始まること', () => {
    expect(getMamaLeaveStartDate('2026-11-05')).toBe('2027-01-01')
  })
})

// 仕様: specs/ikukyu/papa-birth-date/requirements.md#産後パパ育休の取得可能日数の決定（産後パパ育休の終了日）
// パパの産後パパ育休は最大28日間なので「出産予定日 + 27日」で終了日を算出する
describe('【パパ】出生時育児休業給付金の対象期間計算 - 産後パパ育休がいつ終わるかを出産予定日から算出する', () => {
  it('出産予定日が2026年11月1日のとき、上限28日間の産後パパ育休が2026年11月28日に終わること', () => {
    expect(getPapaPaternityLeaveEndDate('2026-11-01')).toBe('2026-11-28')
  })

  // 月末をまたぐケースで年境界の処理を確認する
  it('計算区間が年末をまたぐ場合でも、翌年の正しい終了日になること', () => {
    expect(getPapaPaternityLeaveEndDate('2026-12-15')).toBe('2027-01-11')
  })
})

// 仕様: specs/ikukyu/papa-birth-date/requirements.md#産後パパ育休の取得可能日数の決定（通常育休の開始日）
// パパの通常育休は産後パパ育休（28日）終了の翌日から開始するため「出産予定日 + 28日」で算出する
describe('【パパ】産後パパ育休から通常育休への切り替わり日計算 - 産後パパ育休終了の翌日を通常育休の開始日とする', () => {
  it('出産予定日が2026年11月1日のとき、産後パパ育休終了の翌日である2026年11月29日から通常育休が始まること', () => {
    expect(getPapaLeaveStartDate('2026-11-01')).toBe('2026-11-29')
  })

  it('計算区間が年末をまたぐ場合でも、翌年の正しい開始日になること', () => {
    expect(getPapaLeaveStartDate('2026-12-15')).toBe('2027-01-12')
  })
})

// 仕様: specs/ikukyu/simulator/requirements.md#依存関係（各給付金の振込スケジュール2ヶ月ごと）
// 給付金は2ヶ月ごとに申請するため、育休期間を2ヶ月ブロックに分割する（ママ・パパ共用の処理）
describe('【ママ・パパ共通】振込スケジュール表示 - 育休期間を2ヶ月ごとの支給ブロックに分割する', () => {
  it('ママの育休期間が約4ヶ月のとき、2回の振込ブロックに分割されること', () => {
    const result = splitIntoTwoMonthBlocks('2026-12-28', '2027-04-30')
    expect(result).toHaveLength(2)
    expect(result[0].startDate).toBe('2026-12-28')
    expect(result[result.length - 1].endDate).toBe('2027-04-30')
  })

  // 端数が1ヶ月以上ある場合は別ブロックとして追加する
  it('ママの育休期間に1ヶ月以上の端数が残る場合、3回目の振込ブロックが追加されること', () => {
    const result = splitIntoTwoMonthBlocks('2026-12-28', '2027-05-31')
    expect(result).toHaveLength(3)
    expect(result[0].startDate).toBe('2026-12-28')
    expect(result[result.length - 1].endDate).toBe('2027-05-31')
  })

  // 育休が2ヶ月未満の場合は1ブロックのみで全期間を表す
  it('ママの育休期間が2ヶ月に満たない場合、1回の振込ブロックにまとまること', () => {
    const result = splitIntoTwoMonthBlocks('2026-12-28', '2027-01-31')
    expect(result).toHaveLength(1)
    expect(result[0].startDate).toBe('2026-12-28')
    expect(result[0].endDate).toBe('2027-01-31')
  })

  it('パパの育休期間が約5ヶ月のとき、3回の振込ブロックに分割されること', () => {
    const result = splitIntoTwoMonthBlocks('2026-11-29', '2027-04-30')
    expect(result).toHaveLength(3)
    expect(result[0].startDate).toBe('2026-11-29')
    expect(result[result.length - 1].endDate).toBe('2027-04-30')
  })
})
