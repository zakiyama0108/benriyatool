import { describe, it, expect } from 'vitest'
import { BODY_MIN_LENGTH, BODY_MAX_LENGTH, isValidSectionsLength } from '../../../app/trend-digest/lib/bodyValidation'

// 3観点(fact/reason/caveat)のtextを連結した文字数がtotalLengthになるsectionsを作る
function makeSections(totalLength: number) {
  const each = Math.floor(totalLength / 3)
  const remainder = totalLength - each * 3
  return {
    fact: { heading: '見出し', text: 'あ'.repeat(each + remainder) },
    reason: { heading: '見出し', text: 'あ'.repeat(each) },
    caveat: { heading: '見出し', text: 'あ'.repeat(each) },
  }
}

// 仕様: specs/trend-digest/content-generation/requirements.md#要約-2、specs/trend-digest/content-generation/design.md#本文の分量を検証する処理(決定的なコード)
describe('固定3観点の分量検証 - 「200〜400字程度」の目安を、ai-dev-digestの±20%許容幅と同じ考え方で160〜480字の範囲として判定する', () => {
  it('3観点のtextを連結した文字数が160字未満の場合、falseになること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MIN_LENGTH - 1))).toBe(false)
  })

  it('3観点のtextを連結した文字数が480字を超える場合、falseになること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MAX_LENGTH + 1))).toBe(false)
  })

  it('境界値の160字ちょうどの場合、trueになること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MIN_LENGTH))).toBe(true)
  })

  it('境界値の480字ちょうどの場合、trueになること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MAX_LENGTH))).toBe(true)
  })

  it('160〜480字の範囲内(300字)の場合、trueになること', () => {
    expect(isValidSectionsLength(makeSections(300))).toBe(true)
  })

  // エージェントが取得困難時に返す{ heading: null, sections: null }のnullを失敗シグナルとして扱う(design.md「見出し・固定3観点を書く処理」応答JSONの形式)
  it('sectionsがnullの場合、不正(false)になること', () => {
    expect(isValidSectionsLength(null)).toBe(false)
  })

  it('sectionsがオブジェクトでない場合(数値など)、不正(false)になること', () => {
    expect(isValidSectionsLength(12345)).toBe(false)
  })

  it('fact/reason/caveatのいずれかの観点が欠落している場合、不正(false)になること', () => {
    const { fact, reason } = makeSections(300)
    expect(isValidSectionsLength({ fact, reason })).toBe(false)
  })

  it('いずれかの観点のheadingが空文字の場合、不正(false)になること', () => {
    const sections = makeSections(300)
    expect(isValidSectionsLength({ ...sections, reason: { ...sections.reason, heading: '' } })).toBe(false)
  })

  it('いずれかの観点のtextが空文字の場合、不正(false)になること', () => {
    const sections = makeSections(300)
    expect(isValidSectionsLength({ ...sections, caveat: { ...sections.caveat, text: '' } })).toBe(false)
  })
})
