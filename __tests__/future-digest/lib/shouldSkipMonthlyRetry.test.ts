import { describe, it, expect } from 'vitest'
import { shouldSkipMonthlyRetry } from '../../../app/future-digest/lib/shouldSkipMonthlyRetry'

// 仕様: specs/future-digest/source-review/requirements.md#利用上限への到達時の再実行-7
describe('月次見直しの再実行cronが同じ月の見直しを二重に実行しないための冪等チェック', () => {
  it('その月の本番(または前回の再実行)が正常終了済みならtrue(スキップ)を返すこと', () => {
    expect(shouldSkipMonthlyRetry(true, false)).toBe(true)
  })

  it('その月の見直しPR(オープン・マージ済み・クローズ済みのいずれか)が既にあればtrue(スキップ)を返すこと', () => {
    expect(shouldSkipMonthlyRetry(false, true)).toBe(true)
  })

  it('正常終了済みの実行もPRもどちらもなければfalse(再実行してよい)を返すこと', () => {
    expect(shouldSkipMonthlyRetry(false, false)).toBe(false)
  })
})
