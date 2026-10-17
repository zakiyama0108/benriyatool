import { describe, it, expect } from 'vitest'
import { getScheduledPublishDate, validateScheduledPublishDate } from '../../../app/future-digest/lib/scheduledPublishDate'

// 仕様: specs/future-digest/weekly-publish/requirements.md#利用上限への到達時の再実行-5
describe('本来の配信日の算出 - 実行日時(UTC)から本来の配信日(直近の対象編の配信曜日、JST)を求める', () => {
  describe('サイエンス・テクノロジー編(木曜配信)', () => {
    it('木曜01:43 JST相当のUTC日時(本番cronの起動時刻)を渡すと、その日の日付が返ること', () => {
      // 2026-10-01(木)01:43 JST = 2026-09-30T16:43Z
      expect(getScheduledPublishDate(new Date('2026-09-30T16:43:00Z'), 'science-tech')).toBe('2026-10-01')
    })

    it('木曜13:43 JST(12時間後の再実行cron)を渡すと、同じ週の木曜の日付が返ること', () => {
      // 2026-10-01(木)13:43 JST = 2026-10-01T04:43Z
      expect(getScheduledPublishDate(new Date('2026-10-01T04:43:00Z'), 'science-tech')).toBe('2026-10-01')
    })

    it('金曜01:43 JST(24時間後の再実行cron)を渡すと、同じ週の木曜の日付が返ること', () => {
      // 2026-10-02(金)01:43 JST = 2026-10-01T16:43Z
      expect(getScheduledPublishDate(new Date('2026-10-01T16:43:00Z'), 'science-tech')).toBe('2026-10-01')
    })

    it('金曜13:43 JST(36時間後の再実行cron)を渡すと、同じ週の木曜の日付が返ること', () => {
      // 2026-10-02(金)13:43 JST = 2026-10-02T04:43Z
      expect(getScheduledPublishDate(new Date('2026-10-02T04:43:00Z'), 'science-tech')).toBe('2026-10-01')
    })

    it('週をまたいでも次の木曜の日付は返らないこと(前週の木曜の日付のままであること)', () => {
      // 2026-10-07(水)23:59 JST = 次の木曜(2026-10-08)の前日。まだ次の木曜になっていない
      expect(getScheduledPublishDate(new Date('2026-10-07T14:59:00Z'), 'science-tech')).toBe('2026-10-01')
    })

    it('境界値: 水曜16:43 UTC(=木曜01:43 JST)を渡すと、同じ週の木曜の日付が返ること', () => {
      expect(getScheduledPublishDate(new Date('2026-09-30T16:43:00Z'), 'science-tech')).toBe('2026-10-01')
    })
  })

  describe('くらし・社会編(日曜配信)', () => {
    it('日曜03:43 JST相当のUTC日時(本番cronの起動時刻)を渡すと、その日の日付が返ること', () => {
      // 2026-10-04(日)03:43 JST = 2026-10-03T18:43Z
      expect(getScheduledPublishDate(new Date('2026-10-03T18:43:00Z'), 'life-society')).toBe('2026-10-04')
    })

    it('日曜15:43 JST(12時間後の再実行cron)を渡すと、同じ週の日曜の日付が返ること', () => {
      // 2026-10-04(日)15:43 JST = 2026-10-04T06:43Z
      expect(getScheduledPublishDate(new Date('2026-10-04T06:43:00Z'), 'life-society')).toBe('2026-10-04')
    })

    it('月曜03:43 JST(24時間後の再実行cron)を渡すと、同じ週の日曜の日付が返ること', () => {
      // 2026-10-05(月)03:43 JST = 2026-10-04T18:43Z
      expect(getScheduledPublishDate(new Date('2026-10-04T18:43:00Z'), 'life-society')).toBe('2026-10-04')
    })

    it('月曜15:43 JST(36時間後の再実行cron)を渡すと、同じ週の日曜の日付が返ること', () => {
      // 2026-10-05(月)15:43 JST = 2026-10-05T06:43Z
      expect(getScheduledPublishDate(new Date('2026-10-05T06:43:00Z'), 'life-society')).toBe('2026-10-04')
    })

    it('週をまたいでも次の日曜の日付は返らないこと(前週の日曜の日付のままであること)', () => {
      // 2026-10-10(土)23:59 JST = 次の日曜(2026-10-11)の前日。まだ次の日曜になっていない
      expect(getScheduledPublishDate(new Date('2026-10-10T14:59:00Z'), 'life-society')).toBe('2026-10-04')
    })
  })
})

// 仕様: specs/future-digest/weekly-publish/design.md「セキュリティ」
describe('配信日の入力検証 - workflow_dispatchで手動入力した配信日を対象編の配信曜日(JST)で検証する', () => {
  it('YYYY-MM-DD形式かつ対象編(科学・テクノロジー編=木曜)の実在する配信日なら妥当と判定すること', () => {
    expect(validateScheduledPublishDate('2026-10-01', 'science-tech')).toBe(true)
  })

  it('YYYY-MM-DD形式かつ対象編(くらし・社会編=日曜)の実在する配信日なら妥当と判定すること', () => {
    expect(validateScheduledPublishDate('2026-10-04', 'life-society')).toBe(true)
  })

  it('YYYY-MM-DD形式でない値は不正と判定すること', () => {
    expect(validateScheduledPublishDate('2026/10/01', 'science-tech')).toBe(false)
    expect(validateScheduledPublishDate('2026-10-1', 'science-tech')).toBe(false)
    expect(validateScheduledPublishDate('not-a-date', 'science-tech')).toBe(false)
  })

  it('日付として存在しない値(例: 2026-02-30)は不正と判定すること', () => {
    expect(validateScheduledPublishDate('2026-02-30', 'science-tech')).toBe(false)
  })

  it('科学・テクノロジー編(木曜)に木曜以外の日付を指定した場合は不正と判定すること', () => {
    // 2026-10-02は金曜日
    expect(validateScheduledPublishDate('2026-10-02', 'science-tech')).toBe(false)
  })

  it('くらし・社会編(日曜)に日曜以外の日付を指定した場合は不正と判定すること', () => {
    // 2026-10-01は木曜日(科学・テクノロジー編の配信日)
    expect(validateScheduledPublishDate('2026-10-01', 'life-society')).toBe(false)
  })
})
