import { describe, it, expect } from 'vitest'
import {
  isValidTeaserLength,
  isValidSummaryDetailLength,
  isValidImportance,
} from '../../../app/news-digest/lib/summaryValidation'
import type { TopicSummary } from '../../../app/news-digest/lib/types'

function perspective(prefix: string, overrides: Partial<{ heading: string; teaser: string; detail: string }> = {}) {
  return {
    heading: overrides.heading ?? `${prefix}見出し`,
    teaser: overrides.teaser ?? prefix.repeat(60),
    detail: overrides.detail ?? prefix.repeat(250),
  }
}

function validSummary(overrides: Partial<TopicSummary> = {}): TopicSummary {
  return {
    whatHappened: perspective('あ'),
    whyItMatters: perspective('い'),
    background: perspective('う'),
    outlook: perspective('え'),
    ...overrides,
  }
}

// 仕様: specs/news-digest/content-generation/requirements.md#要約-2、specs/news-digest/content-generation/design.md#要約の分量を検証する処理(決定的なコード)
describe('導入文(teaser)の分量検証 - 60〜120字程度という目安の許容幅(40〜140字)の範囲内かを判定する', () => {
  it('39字(下限未満)のとき不正と判定されること', () => {
    expect(isValidTeaserLength('あ'.repeat(39))).toBe(false)
  })

  it('40字(下限)ちょうどのとき正常と判定されること', () => {
    expect(isValidTeaserLength('あ'.repeat(40))).toBe(true)
  })

  it('140字(上限)ちょうどのとき正常と判定されること', () => {
    expect(isValidTeaserLength('あ'.repeat(140))).toBe(true)
  })

  it('141字(上限超過)のとき不正と判定されること', () => {
    expect(isValidTeaserLength('あ'.repeat(141))).toBe(false)
  })
})

// 仕様: specs/news-digest/content-generation/requirements.md#要約-3、specs/news-digest/content-generation/requirements.md#要約-4、specs/news-digest/content-generation/design.md#要約の分量を検証する処理(決定的なコード)
describe('要約全体(固定4観点)の分量・完全性検証 - 4観点すべてが揃い、各観点の分量が範囲内かを判定する', () => {
  it('summaryがnullのとき不正と判定されること', () => {
    expect(isValidSummaryDetailLength(null)).toBe(false)
  })

  it('summaryがオブジェクトでない(文字列)とき不正と判定されること', () => {
    expect(isValidSummaryDetailLength('要約テキスト')).toBe(false)
  })

  it('固定4観点(whatHappened/whyItMatters/background/outlook)のいずれかが欠けているとき不正と判定されること', () => {
    const summary = validSummary() as Record<string, unknown>
    delete summary.outlook
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('いずれかの観点のheading・teaser・detailが空文字のとき不正と判定されること', () => {
    const summary = validSummary({ whatHappened: perspective('あ', { heading: '' }) })
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('いずれかの観点のteaserが範囲外(140字超)のとき不正と判定されること', () => {
    const summary = validSummary({ whatHappened: perspective('あ', { teaser: 'あ'.repeat(141) }) })
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('4観点のdetail合計が799字(下限未満)のとき不正と判定されること', () => {
    const summary: TopicSummary = {
      whatHappened: perspective('あ', { detail: 'あ'.repeat(200) }),
      whyItMatters: perspective('い', { detail: 'い'.repeat(200) }),
      background: perspective('う', { detail: 'う'.repeat(200) }),
      outlook: perspective('え', { detail: 'え'.repeat(199) }),
    }
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('4観点のdetail合計が1701字(上限超過)のとき不正と判定されること', () => {
    const summary: TopicSummary = {
      whatHappened: perspective('あ', { detail: 'あ'.repeat(500) }),
      whyItMatters: perspective('い', { detail: 'い'.repeat(500) }),
      background: perspective('う', { detail: 'う'.repeat(500) }),
      outlook: perspective('え', { detail: 'え'.repeat(201) }),
    }
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('4観点すべてが揃い、teaser・detail合計とも範囲内のとき正常と判定されること', () => {
    expect(isValidSummaryDetailLength(validSummary())).toBe(true)
  })
})

// 仕様: specs/news-digest/content-generation/requirements.md#重要度-8
describe('重要度(importance)の検証 - 1〜5の整数かどうかを判定する', () => {
  it('0(下限未満)のとき不正と判定されること', () => {
    expect(isValidImportance(0)).toBe(false)
  })

  it('6(上限超過)のとき不正と判定されること', () => {
    expect(isValidImportance(6)).toBe(false)
  })

  it('3.5(整数でない)のとき不正と判定されること', () => {
    expect(isValidImportance(3.5)).toBe(false)
  })

  it('文字列など非数値のとき不正と判定されること', () => {
    expect(isValidImportance('4')).toBe(false)
  })

  it('1〜5の整数のとき正常と判定されること', () => {
    expect(isValidImportance(1)).toBe(true)
    expect(isValidImportance(5)).toBe(true)
  })
})
