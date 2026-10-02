import { describe, it, expect } from 'vitest'
import {
  BODY_MIN_LENGTH,
  BODY_MAX_LENGTH,
  isValidBodyLength,
  isValidHeading,
  mentionsPreprint,
} from '../../../app/research-digest/lib/bodyValidation'

function makeBody(length: number): string {
  return 'あ'.repeat(length)
}

// 仕様: specs/research-digest/content-generation/requirements.md#要約-3
describe('本文の分量チェック - 本文の分量(200〜400字程度)を160〜480字の範囲で確かめる', () => {
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
describe('査読前の論文の明記チェック - 査読前であることが注意点として本文に書かれているかを最低限確かめる', () => {
  it('本文に「査読」という語があれば、査読前であることの明記があるとみなすこと', () => {
    expect(mentionsPreprint('この研究はまだ査読を受けていない点に注意が必要です')).toBe(true)
  })

  it('本文に「査読」という語がなければ、明記がないとみなすこと', () => {
    expect(mentionsPreprint('この研究は500人を対象に行われました')).toBe(false)
  })
})
