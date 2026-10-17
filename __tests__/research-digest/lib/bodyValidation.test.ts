import { describe, it, expect } from 'vitest'
import {
  BODY_MIN_LENGTH,
  BODY_MAX_LENGTH,
  isValidBodyLength,
  isValidHeading,
  isValidSectionsLength,
  mentionsPreprint,
} from '../../../app/research-digest/lib/bodyValidation'

function makeBody(length: number): string {
  return 'あ'.repeat(length)
}

// 4観点(finding/basis/relevance/caveat)のtext合計がtotalLengthになるsectionsを作る
// (finding観点の文字数で合計を調整し、basis/relevance/caveatは固定1字ずつにする)
function makeSections(totalLength: number, overrides: Partial<Record<'finding' | 'basis' | 'relevance' | 'caveat', { heading?: string; text?: string }>> = {}) {
  const fixedLength = 3 // basis・relevance・caveatの固定分(1字×3観点)
  const findingLength = Math.max(totalLength - fixedLength, 0)
  const base = {
    finding: { heading: '何が分かったか見出し', text: 'あ'.repeat(findingLength) },
    basis: { heading: 'なぜそう結論づけられたのか見出し', text: 'い' },
    relevance: { heading: '暮らしへの関わり見出し', text: 'う' },
    caveat: { heading: '注意点見出し', text: 'え' },
  }
  return {
    finding: { ...base.finding, ...overrides.finding },
    basis: { ...base.basis, ...overrides.basis },
    relevance: { ...base.relevance, ...overrides.relevance },
    caveat: { ...base.caveat, ...overrides.caveat },
  }
}

// 仕様: specs/research-digest/article-detail/design.md「バリデーション」
describe('旧形式(LegacyFinding)の本文の分量チェック - この機能(固定4観点)より前に公開した記事データのbodyを160〜480字の範囲で確かめる', () => {
  it('160字未満は不正であること', () => {
    expect(isValidBodyLength(makeBody(BODY_MIN_LENGTH - 1))).toBe(false)
  })

  it('480字を超える場合は不正であること', () => {
    expect(isValidBodyLength(makeBody(BODY_MAX_LENGTH + 1))).toBe(false)
  })

  it('160字ちょうど・480字ちょうどは妥当であること', () => {
    expect(isValidBodyLength(makeBody(BODY_MIN_LENGTH))).toBe(true)
    expect(isValidBodyLength(makeBody(BODY_MAX_LENGTH))).toBe(true)
  })

  it('本文がnull・空文字なら不正であること(元の論文を読めなかった場合の失敗シグナル)', () => {
    expect(isValidBodyLength(null)).toBe(false)
    expect(isValidBodyLength('')).toBe(false)
  })
})

// 仕様: specs/research-digest/content-generation/requirements.md#要約-3
describe('新形式(CurrentFinding)の固定4観点の分量チェック - finding/basis/relevance/caveatのtextを連結した文字数を160〜480字の範囲で確かめる', () => {
  it('4観点のtext合計が160字未満は不正であること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MIN_LENGTH - 1))).toBe(false)
  })

  it('4観点のtext合計が480字を超える場合は不正であること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MAX_LENGTH + 1))).toBe(false)
  })

  it('4観点のtext合計が160字ちょうど・480字ちょうどは妥当であること', () => {
    expect(isValidSectionsLength(makeSections(BODY_MIN_LENGTH))).toBe(true)
    expect(isValidSectionsLength(makeSections(BODY_MAX_LENGTH))).toBe(true)
  })

  it('sectionsがnullのとき不正であること(元の論文を読めなかった場合の失敗シグナル)', () => {
    expect(isValidSectionsLength(null)).toBe(false)
  })

  it('finding/basis/relevance/caveatのいずれかの観点が欠けている場合は不正であること', () => {
    const sections = makeSections(200) as Record<string, unknown>
    delete sections.caveat
    expect(isValidSectionsLength(sections)).toBe(false)
  })

  it('いずれかの観点のheadingが空文字の場合は不正であること', () => {
    expect(isValidSectionsLength(makeSections(200, { basis: { heading: '' } }))).toBe(false)
  })

  it('いずれかの観点のtextが空文字の場合は不正であること', () => {
    expect(isValidSectionsLength(makeSections(200, { relevance: { text: '' } }))).toBe(false)
  })
})

// 仕様: specs/research-digest/content-generation/requirements.md#要約-1
describe('見出しのチェック - 見出しが空でなく100字以内であることを確かめる', () => {
  it('nullや空文字は不正であること', () => {
    expect(isValidHeading(null)).toBe(false)
    expect(isValidHeading('')).toBe(false)
  })

  it('101字は不正、100字ちょうどは妥当であること', () => {
    expect(isValidHeading('あ'.repeat(101))).toBe(false)
    expect(isValidHeading('あ'.repeat(100))).toBe(true)
  })

  it('通常の見出しは妥当であること', () => {
    expect(isValidHeading('見出し')).toBe(true)
  })
})

// 仕様: specs/research-digest/content-generation/requirements.md#要約-2
describe('査読前の論文の明記チェック - 査読前であることが固定4観点のtextを連結した文字列に書かれているかを最低限確かめる', () => {
  it('連結後の文字列に「査読」という語があれば、査読前であることの明記があるとみなすこと', () => {
    expect(mentionsPreprint('この研究はまだ査読を受けていない点に注意が必要です')).toBe(true)
  })

  it('連結後の文字列に「査読」という語がなければ、明記がないとみなすこと', () => {
    expect(mentionsPreprint('この研究は500人を対象に行われました')).toBe(false)
  })
})
