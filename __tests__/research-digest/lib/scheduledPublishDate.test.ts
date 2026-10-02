import { describe, it, expect } from 'vitest'
import { getScheduledPublishDate, validateScheduledPublishDate } from '../../../app/research-digest/lib/scheduledPublishDate'

// 仕様: specs/research-digest/weekly-publish/requirements.md#利用上限への到達時の再実行-5
describe('本来の配信日の算出 - 実行日時(UTC)から本来の配信日(直近の月曜、JST)を求める', () => {
  it('月曜07:43 JST相当のUTC日時(本番cronの起動時刻)を渡すと、その日の日付が返ること', () => {
    // 2026-10-05(月)07:43 JST = 2026-10-04T22:43Z
    expect(getScheduledPublishDate(new Date('2026-10-04T22:43:00Z'))).toBe('2026-10-05')
  })

  it('月曜19:43 JST(12時間後の再実行cron)を渡すと、同じ週の月曜の日付が返ること', () => {
    // 2026-10-05(月)19:43 JST = 2026-10-05T10:43Z
    expect(getScheduledPublishDate(new Date('2026-10-05T10:43:00Z'))).toBe('2026-10-05')
  })

  it('火曜07:43 JST(24時間後の再実行cron)を渡すと、同じ週の月曜の日付が返ること', () => {
    // 2026-10-06(火)07:43 JST = 2026-10-05T22:43Z
    expect(getScheduledPublishDate(new Date('2026-10-05T22:43:00Z'))).toBe('2026-10-05')
  })

  it('火曜19:43 JST(36時間後の再実行cron)を渡すと、同じ週の月曜の日付が返ること', () => {
    // 2026-10-06(火)19:43 JST = 2026-10-06T10:43Z
    expect(getScheduledPublishDate(new Date('2026-10-06T10:43:00Z'))).toBe('2026-10-05')
  })

  it('週をまたいでも次の月曜の日付は返らないこと(前週の月曜の日付のままであること)', () => {
    // 2026-10-11(日)23:59 JST = 次の月曜(2026-10-12)の直前。まだ次の月曜になっていない
    expect(getScheduledPublishDate(new Date('2026-10-11T14:59:00Z'))).toBe('2026-10-05')
  })

  it('境界値: 日曜22:43 UTC(=月曜07:43 JST)を渡すと、同じ週の月曜の日付が返ること', () => {
    expect(getScheduledPublishDate(new Date('2026-10-04T22:43:00Z'))).toBe('2026-10-05')
  })
})

// 仕様: specs/research-digest/weekly-publish/design.md「セキュリティ」
describe('配信日の入力検証 - workflow_dispatchで手動入力した配信日を検証する', () => {
  it('YYYY-MM-DD形式かつ実在する月曜日(JST)なら妥当と判定すること', () => {
    expect(validateScheduledPublishDate('2026-10-05')).toBe(true)
  })

  it('YYYY-MM-DD形式でない値は不正と判定すること', () => {
    expect(validateScheduledPublishDate('2026/10/05')).toBe(false)
    expect(validateScheduledPublishDate('2026-10-5')).toBe(false)
    expect(validateScheduledPublishDate('not-a-date')).toBe(false)
  })

  it('日付として存在しない値(例: 2026-02-30)は不正と判定すること', () => {
    expect(validateScheduledPublishDate('2026-02-30')).toBe(false)
  })

  it('実在するが月曜日でない日付は不正と判定すること', () => {
    // 2026-10-06は火曜日
    expect(validateScheduledPublishDate('2026-10-06')).toBe(false)
  })
})
