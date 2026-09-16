import { describe, it, expect } from 'vitest'
import { isUsableContent, isQuotaExhaustionError } from '../../../app/news-digest/lib/generateContent'
import type { GeneratedContent } from '../../../app/news-digest/lib/generateContent'
import type { TopicSummary } from '../../../app/news-digest/lib/types'

function perspective(prefix: string) {
  return { heading: `${prefix}見出し`, teaser: prefix.repeat(60), detail: prefix.repeat(250) }
}

function validSummary(): TopicSummary {
  return {
    whatHappened: perspective('あ'),
    whyItMatters: perspective('い'),
    background: perspective('う'),
    outlook: perspective('え'),
  }
}

function validContent(overrides: Partial<GeneratedContent> = {}): GeneratedContent {
  return {
    heading: '保育料の一部が来年度から無償化される',
    importance: 4,
    summary: validSummary(),
    ...overrides,
  }
}

// 仕様: specs/news-digest/content-generation/design.md#エラーハンドリング
describe('生成結果の利用可否判定 - summaryがnull、または分量検証に失敗する場合は生成失敗として除外する', () => {
  it('summaryがnullのとき利用不可と判定されること(WebFetch等で取得困難だった場合の失敗シグナル)', () => {
    expect(isUsableContent({ heading: '見出し', importance: 3, summary: null })).toBe(false)
  })

  it('固定4観点のいずれかが欠けているとき利用不可と判定されること', () => {
    const summary = validSummary() as Record<string, unknown>
    delete summary.outlook
    expect(isUsableContent({ heading: '見出し', importance: 3, summary })).toBe(false)
  })

  it('いずれかの観点のteaserが範囲外(140字超)のとき利用不可と判定されること', () => {
    const summary = { ...validSummary(), whatHappened: { heading: '見出し', teaser: 'あ'.repeat(141), detail: 'あ'.repeat(250) } }
    expect(isUsableContent(validContent({ summary }))).toBe(false)
  })

  it('4観点のdetail合計が範囲外(799字)のとき利用不可と判定されること', () => {
    const summary: TopicSummary = {
      whatHappened: { heading: '見出し1', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(200) },
      whyItMatters: { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(200) },
      background: { heading: '見出し3', teaser: 'う'.repeat(60), detail: 'う'.repeat(200) },
      outlook: { heading: '見出し4', teaser: 'え'.repeat(60), detail: 'え'.repeat(199) },
    }
    expect(isUsableContent(validContent({ summary }))).toBe(false)
  })

  it('importanceが範囲外(1〜5の整数でない)のとき利用不可と判定されること', () => {
    expect(isUsableContent(validContent({ importance: 6 }))).toBe(false)
  })

  it('headingが空文字のとき利用不可と判定されること', () => {
    expect(isUsableContent(validContent({ heading: '' }))).toBe(false)
  })

  it('見出し・重要度・固定4観点(分量範囲内)がすべて揃っているとき利用可と判定されること', () => {
    expect(isUsableContent(validContent())).toBe(true)
  })
})

// 仕様: specs/news-digest/weekly-publish/design.md#エラーハンドリング、specs/news-digest/weekly-publish/requirements.md#掲載件数の保証-2
describe('利用枠枯渇の判定 - rate_limit/session limit/usage limit/429のいずれかを含む場合に検知すること', () => {
  it.each([
    ['rate_limit を含むエラーメッセージ', 'Error: rate_limit_error occurred'],
    ['大文字小文字が異なるRATE_LIMIT', 'RATE_LIMIT exceeded'],
    ['session limitを含むメッセージ', "You've hit your session limit"],
    ['usage limitを含むメッセージ', 'usage limit reached for this account'],
    ['429を含むメッセージ', 'Request failed with status code 429'],
  ])('%s のとき利用枠枯渇と判定されること', (_label, text) => {
    expect(isQuotaExhaustionError(text)).toBe(true)
  })

  it('単純なJSON不正等、利用枠枯渇を示すパターンを含まない場合はfalseになること', () => {
    expect(isQuotaExhaustionError('Unexpected token < in JSON at position 0')).toBe(false)
  })

  it('空文字のとき利用枠枯渇と判定されないこと', () => {
    expect(isQuotaExhaustionError('')).toBe(false)
  })
})
