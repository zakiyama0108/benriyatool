import { describe, it, expect } from 'vitest'
import { SUMMARY_MIN_LENGTH, SUMMARY_MAX_LENGTH, isValidSummaryLength } from '../../../app/ai-dev-digest/lib/summaryValidation'

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#要約-2
describe('要約の文字数検証 - 100〜150字程度の「程度」を±20字の許容幅として機械的に判定する', () => {
  it('下限の80字ちょうどのとき、有効と判定されること', () => {
    expect(isValidSummaryLength('あ'.repeat(SUMMARY_MIN_LENGTH))).toBe(true)
  })

  it('上限の170字ちょうどのとき、有効と判定されること', () => {
    expect(isValidSummaryLength('あ'.repeat(SUMMARY_MAX_LENGTH))).toBe(true)
  })

  it('79字(下限未満)のとき、無効と判定されること', () => {
    expect(isValidSummaryLength('あ'.repeat(SUMMARY_MIN_LENGTH - 1))).toBe(false)
  })

  it('171字(上限超過)のとき、無効と判定されること', () => {
    expect(isValidSummaryLength('あ'.repeat(SUMMARY_MAX_LENGTH + 1))).toBe(false)
  })

  it('120字(推奨レンジの中央付近)のとき、有効と判定されること', () => {
    expect(isValidSummaryLength('あ'.repeat(120))).toBe(true)
  })
})
