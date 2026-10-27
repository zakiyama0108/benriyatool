import { describe, it, expect } from 'vitest'
import { toJstDateString } from '../../../app/trend-digest/lib/jstDate'

// 仕様: specs/trend-digest/trend-history/requirements.md#機能要件-1、specs/trend-digest/trend-history/design.md「その回の観測を履歴に記録する処理」
describe('観測ログの実行日(toJstDateString) - 記事ファイルと同じくJSTの日付(YYYY-MM-DD)を返す', () => {
  it('UTCではまだ前日でも、JSTで日付が変わっていればJSTの日付を返すこと(週次cronはUTC 16:43=JST翌01:43に起動するため)', () => {
    expect(toJstDateString(new Date('2026-10-22T20:16:44Z'))).toBe('2026-10-23')
  })

  it('UTCとJSTで日付が同じ時間帯では、その日付を返すこと', () => {
    expect(toJstDateString(new Date('2026-10-16T00:46:25Z'))).toBe('2026-10-16')
  })

  it('JSTの23:59は当日、JSTの0:00は翌日として扱うこと', () => {
    expect(toJstDateString(new Date('2026-10-22T14:59:59Z'))).toBe('2026-10-22')
    expect(toJstDateString(new Date('2026-10-22T15:00:00Z'))).toBe('2026-10-23')
  })
})
