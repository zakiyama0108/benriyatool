import { describe, it, expect } from 'vitest'
import { getScheduledPublishDate, validateScheduledPublishDate } from '../../../app/research-digest/lib/scheduledPublishDate'

// 仕様: specs/research-digest/weekly-publish/requirements.md#利用上限への到達時の再実行-5
describe('本来の配信日の算出(からだ・くらし編) - 実行日時(UTC)から本来の配信日(直近の月曜、JST)を求める', () => {
  it('月曜07:43 JST相当のUTC日時(本番cronの起動時刻)を渡すと、その日の日付が返ること', () => {
    // 2026-10-05(月)07:43 JST = 2026-10-04T22:43Z
    expect(getScheduledPublishDate(new Date('2026-10-04T22:43:00Z'), 'body-life')).toBe('2026-10-05')
  })

  it('月曜19:43 JST(12時間後の再実行cron)を渡すと、同じ週の月曜の日付が返ること', () => {
    // 2026-10-05(月)19:43 JST = 2026-10-05T10:43Z
    expect(getScheduledPublishDate(new Date('2026-10-05T10:43:00Z'), 'body-life')).toBe('2026-10-05')
  })

  it('火曜07:43 JST(24時間後の再実行cron)を渡すと、同じ週の月曜の日付が返ること', () => {
    // 2026-10-06(火)07:43 JST = 2026-10-05T22:43Z
    expect(getScheduledPublishDate(new Date('2026-10-05T22:43:00Z'), 'body-life')).toBe('2026-10-05')
  })

  it('火曜19:43 JST(36時間後の再実行cron)を渡すと、同じ週の月曜の日付が返ること', () => {
    // 2026-10-06(火)19:43 JST = 2026-10-06T10:43Z
    expect(getScheduledPublishDate(new Date('2026-10-06T10:43:00Z'), 'body-life')).toBe('2026-10-05')
  })

  it('週をまたいでも次の月曜の日付は返らないこと(前週の月曜の日付のままであること)', () => {
    // 2026-10-11(日)23:59 JST = 次の月曜(2026-10-12)の直前。まだ次の月曜になっていない
    expect(getScheduledPublishDate(new Date('2026-10-11T14:59:00Z'), 'body-life')).toBe('2026-10-05')
  })

  it('境界値: 日曜22:43 UTC(=月曜07:43 JST)を渡すと、同じ週の月曜の日付が返ること', () => {
    expect(getScheduledPublishDate(new Date('2026-10-04T22:43:00Z'), 'body-life')).toBe('2026-10-05')
  })
})

// 仕様: specs/research-digest/weekly-publish/requirements.md#配信スケジュール-2
describe('本来の配信日の算出(科学・社会編) - 実行日時(UTC)から本来の配信日(直近の土曜、JST)を求める', () => {
  it('土曜11:43 JST相当のUTC日時(本番cronの起動時刻)を渡すと、その日の日付が返ること', () => {
    // 2026-10-10(土)11:43 JST = 2026-10-10T02:43Z
    expect(getScheduledPublishDate(new Date('2026-10-10T02:43:00Z'), 'science-society')).toBe('2026-10-10')
  })

  it('土曜23:43 JST(12時間後の再実行cron)を渡すと、同じ週の土曜の日付が返ること', () => {
    // 2026-10-10(土)23:43 JST = 2026-10-10T14:43Z
    expect(getScheduledPublishDate(new Date('2026-10-10T14:43:00Z'), 'science-society')).toBe('2026-10-10')
  })

  it('日曜11:43 JST(24時間後の再実行cron)を渡すと、同じ週の土曜の日付が返ること', () => {
    // 2026-10-11(日)11:43 JST = 2026-10-11T02:43Z
    expect(getScheduledPublishDate(new Date('2026-10-11T02:43:00Z'), 'science-society')).toBe('2026-10-10')
  })

  it('日曜23:43 JST(36時間後の再実行cron)を渡すと、同じ週の土曜の日付が返ること', () => {
    // 2026-10-11(日)23:43 JST = 2026-10-11T14:43Z
    expect(getScheduledPublishDate(new Date('2026-10-11T14:43:00Z'), 'science-society')).toBe('2026-10-10')
  })

  it('週をまたいでも次の土曜の日付は返らないこと(前週の土曜の日付のままであること)', () => {
    // 2026-10-17(土)の直前(2026-10-16(金)23:59 JST)はまだ次の土曜になっていない
    expect(getScheduledPublishDate(new Date('2026-10-16T14:59:00Z'), 'science-society')).toBe('2026-10-10')
  })
})

// 仕様: specs/research-digest/weekly-publish/design.md「セキュリティ」
describe('配信日の入力検証 - workflow_dispatchで手動入力した配信日を対象編の配信曜日と照合する', () => {
  it('YYYY-MM-DD形式かつ対象編の配信曜日(JST)なら妥当と判定すること', () => {
    expect(validateScheduledPublishDate('2026-10-05', 'body-life')).toBe(true)
    expect(validateScheduledPublishDate('2026-10-10', 'science-society')).toBe(true)
  })

  it('YYYY-MM-DD形式でない値は不正と判定すること', () => {
    expect(validateScheduledPublishDate('2026/10/05', 'body-life')).toBe(false)
    expect(validateScheduledPublishDate('2026-10-5', 'body-life')).toBe(false)
    expect(validateScheduledPublishDate('not-a-date', 'body-life')).toBe(false)
  })

  it('日付として存在しない値(例: 2026-02-30)は不正と判定すること', () => {
    expect(validateScheduledPublishDate('2026-02-30', 'body-life')).toBe(false)
  })

  it('実在するが対象編の配信曜日でない日付は不正と判定すること', () => {
    // 2026-10-06は火曜日(からだ・くらし編の配信曜日ではない)
    expect(validateScheduledPublishDate('2026-10-06', 'body-life')).toBe(false)
    // 2026-10-05は月曜日(科学・社会編の配信曜日ではない)
    expect(validateScheduledPublishDate('2026-10-05', 'science-society')).toBe(false)
  })
})
