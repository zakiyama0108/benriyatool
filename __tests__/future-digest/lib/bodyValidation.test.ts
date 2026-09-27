import { describe, it, expect } from 'vitest'
import { BODY_MIN_LENGTH, BODY_MAX_LENGTH, isValidBodyLength, isValidHeading } from '../../../app/future-digest/lib/bodyValidation'

function makeBody(length: number): string {
  return 'あ'.repeat(length)
}

// 仕様: specs/future-digest/content-generation/requirements.md#要約-3
describe('isValidBodyLength - 本文の分量(200〜400字程度)を160〜480字の範囲で検証する', () => {
  it('160字未満は不正であること', () => {
    expect(isValidBodyLength(makeBody(BODY_MIN_LENGTH - 1))).toBe(false)
  })

  it('480字を超える場合は不正であること', () => {
    expect(isValidBodyLength(makeBody(BODY_MAX_LENGTH + 1))).toBe(false)
  })

  it('160字ちょうどは妥当であること', () => {
    expect(isValidBodyLength(makeBody(BODY_MIN_LENGTH))).toBe(true)
  })

  it('480字ちょうどは妥当であること', () => {
    expect(isValidBodyLength(makeBody(BODY_MAX_LENGTH))).toBe(true)
  })

  it('nullは不正であること', () => {
    expect(isValidBodyLength(null)).toBe(false)
  })

  it('空文字は不正であること', () => {
    expect(isValidBodyLength('')).toBe(false)
  })
})

// 仕様: specs/future-digest/content-generation/design.md「生成結果を検証する処理」
describe('isValidHeading - 見出しが非空文字列かつ100字以内であることを検証する', () => {
  it('nullは不正であること', () => {
    expect(isValidHeading(null)).toBe(false)
  })

  it('空文字は不正であること', () => {
    expect(isValidHeading('')).toBe(false)
  })

  it('100字を超える見出しは不正であること', () => {
    expect(isValidHeading('あ'.repeat(101))).toBe(false)
  })

  it('100字ちょうどの見出しは妥当であること', () => {
    expect(isValidHeading('あ'.repeat(100))).toBe(true)
  })

  it('通常の見出しは妥当であること', () => {
    expect(isValidHeading('見出し')).toBe(true)
  })
})
