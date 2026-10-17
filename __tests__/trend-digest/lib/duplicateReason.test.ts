import { describe, it, expect } from 'vitest'
import { isDuplicateOfLastPublishedReason } from '../../../app/trend-digest/lib/duplicateReason'

function makeReason(length = 200): string {
  return 'あ'.repeat(length)
}

// 仕様: specs/trend-digest/content-generation/requirements.md#エージェントの逸脱防止-7、specs/trend-digest/content-generation/design.md#本文の分量を検証する処理(決定的なコード)
describe('続報の重複reason検知 - 前回掲載時の「なぜ注目されたか」観点と完全に同一の本文を、同じ内容の繰り返し公開を防ぐ最終防波堤として検知する', () => {
  it('前回掲載時のreason.textと一字一句同じ場合、重複と判定されること', () => {
    const reason = makeReason()
    expect(isDuplicateOfLastPublishedReason(reason, reason)).toBe(true)
  })

  it('前回掲載時のreason.textと前後の空白だけが異なる場合、重複と判定されること(前後の空白を除いて比較する)', () => {
    const reason = makeReason()
    expect(isDuplicateOfLastPublishedReason(`  ${reason}\n`, reason)).toBe(true)
  })

  it('1文字でも異なるreason.textは重複と判定されないこと', () => {
    const previous = makeReason()
    const current = `${makeReason(199)}い` // 末尾1文字だけ異なる
    expect(isDuplicateOfLastPublishedReason(current, previous)).toBe(false)
  })

  it('前回掲載時のreasonがない(初回掲載)場合は、重複と判定されないこと', () => {
    expect(isDuplicateOfLastPublishedReason(makeReason(), null)).toBe(false)
  })
})
