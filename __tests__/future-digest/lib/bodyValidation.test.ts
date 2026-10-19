import { describe, it, expect } from 'vitest'
import { BODY_MIN_LENGTH, BODY_MAX_LENGTH, isValidSectionsLength, isValidHeading } from '../../../app/future-digest/lib/bodyValidation'

function makeSection(length: number, overrides: Partial<{ heading: string; text: string }> = {}) {
  return { heading: '見出し', text: 'あ'.repeat(length), diagram: null, ...overrides }
}

// 3観点のtextの合計が指定文字数になるよう、ほぼ均等に3分割して組み立てる
function makeSections(totalLength: number) {
  const base = Math.floor(totalLength / 3)
  const remainder = totalLength - base * 3
  return {
    when: makeSection(base + remainder),
    basis: makeSection(base),
    impact: makeSection(base),
  }
}

// 仕様: specs/future-digest/content-generation/requirements.md#要約-3
describe('固定3観点(sections)の分量検証 - 3観点のtextを連結した文字数(200〜400字程度)を160〜480字の範囲で検証する', () => {
  it('3観点合計が160字未満は不正であること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MIN_LENGTH - 1))).toBe(false)
  })

  it('3観点合計が480字を超える場合は不正であること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MAX_LENGTH + 1))).toBe(false)
  })

  it('3観点合計が160字ちょうどは妥当であること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MIN_LENGTH))).toBe(true)
  })

  it('3観点合計が480字ちょうどは妥当であること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MAX_LENGTH))).toBe(true)
  })

  it('sectionsがnullのとき、不正であること', () => {
    expect(isValidSectionsLength(null)).toBe(false)
  })

  it('whenキーが欠落しているとき、不正であること', () => {
    const sections = makeSections(250) as Record<string, unknown>
    delete sections.when
    expect(isValidSectionsLength(sections)).toBe(false)
  })

  it('basisのheadingが空文字のとき、不正であること', () => {
    const sections = makeSections(250)
    sections.basis = makeSection(80, { heading: '' })
    expect(isValidSectionsLength(sections)).toBe(false)
  })

  it('impactのtextが空文字のとき、不正であること', () => {
    const sections = makeSections(250)
    sections.impact = makeSection(0)
    expect(isValidSectionsLength(sections)).toBe(false)
  })
})

// 仕様: specs/future-digest/content-generation/design.md「生成結果を検証する処理」
describe('見出しの検証 - 見出しが非空文字列かつ100字以内であることを検証する', () => {
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
