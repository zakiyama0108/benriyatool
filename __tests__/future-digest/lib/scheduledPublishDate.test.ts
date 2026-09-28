import { describe, it, expect } from 'vitest'
import { getScheduledPublishDate, validateScheduledPublishDate } from '../../../app/future-digest/lib/scheduledPublishDate'

// 仕様: specs/future-digest/weekly-publish/requirements.md#利用上限への到達時の再実行-5
describe('本来の配信日の算出 - 実行日時(UTC)から本来の配信日(直近の木曜、JST)を求める', () => {
  it('木曜07:43 JST相当のUTC日時(本番cronの起動時刻)を渡すと、その日の日付が返ること', () => {
    // 2026-10-01(木)07:43 JST = 2026-09-30T22:43Z
    expect(getScheduledPublishDate(new Date('2026-09-30T22:43:00Z'))).toBe('2026-10-01')
  })

  it('木曜19:43 JST(12時間後の再実行cron)を渡すと、同じ週の木曜の日付が返ること', () => {
    // 2026-10-01(木)19:43 JST = 2026-10-01T10:43Z
    expect(getScheduledPublishDate(new Date('2026-10-01T10:43:00Z'))).toBe('2026-10-01')
  })

  it('金曜07:43 JST(24時間後の再実行cron)を渡すと、同じ週の木曜の日付が返ること', () => {
    // 2026-10-02(金)07:43 JST = 2026-10-01T22:43Z
    expect(getScheduledPublishDate(new Date('2026-10-01T22:43:00Z'))).toBe('2026-10-01')
  })

  it('金曜19:43 JST(36時間後の再実行cron)を渡すと、同じ週の木曜の日付が返ること', () => {
    // 2026-10-02(金)19:43 JST = 2026-10-02T10:43Z
    expect(getScheduledPublishDate(new Date('2026-10-02T10:43:00Z'))).toBe('2026-10-01')
  })

  it('週をまたいでも次の木曜の日付は返らないこと(前週の木曜の日付のままであること)', () => {
    // 2026-10-07(水)23:59 JST = 次の木曜(2026-10-08)の前日。まだ次の木曜になっていない
    expect(getScheduledPublishDate(new Date('2026-10-07T14:59:00Z'))).toBe('2026-10-01')
  })

  it('境界値: 水曜22:43 UTC(=木曜07:43 JST)を渡すと、同じ週の木曜の日付が返ること', () => {
    expect(getScheduledPublishDate(new Date('2026-09-30T22:43:00Z'))).toBe('2026-10-01')
  })
})

// 仕様: specs/future-digest/weekly-publish/design.md「セキュリティ」
describe('配信日の入力検証 - workflow_dispatchで手動入力した配信日を検証する', () => {
  it('YYYY-MM-DD形式かつ実在する木曜日(JST)なら妥当と判定すること', () => {
    expect(validateScheduledPublishDate('2026-10-01')).toBe(true)
  })

  it('YYYY-MM-DD形式でない値は不正と判定すること', () => {
    expect(validateScheduledPublishDate('2026/10/01')).toBe(false)
    expect(validateScheduledPublishDate('2026-10-1')).toBe(false)
    expect(validateScheduledPublishDate('not-a-date')).toBe(false)
  })

  it('日付として存在しない値(例: 2026-02-30)は不正と判定すること', () => {
    expect(validateScheduledPublishDate('2026-02-30')).toBe(false)
  })

  it('実在するが木曜日でない日付は不正と判定すること', () => {
    // 2026-10-02は金曜日
    expect(validateScheduledPublishDate('2026-10-02')).toBe(false)
  })
})
