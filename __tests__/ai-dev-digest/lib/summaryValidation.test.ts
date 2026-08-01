import { describe, it, expect } from 'vitest'
import {
  SUMMARY_TOTAL_MIN_LENGTH,
  SUMMARY_TOTAL_MAX_LENGTH,
  isValidSummaryLength,
} from '../../../app/ai-dev-digest/lib/summaryValidation'
import type { SummarySection } from '../../../app/ai-dev-digest/lib/types'

function makeSections(bodyLengths: number[]): SummarySection[] {
  return bodyLengths.map((length, index) => ({
    heading: `見出し${index + 1}`,
    body: 'あ'.repeat(length),
  }))
}

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#要約-2、specs/ai-dev-digest/content-generation/requirements.md#要約-3、specs/ai-dev-digest/content-generation/requirements.md#著作権への配慮(根拠)-2、specs/ai-dev-digest/content-generation/requirements.md#著作権への配慮(根拠)-3、specs/ai-dev-digest/article-detail/requirements.md#表示分量・著作権配慮-1、specs/ai-dev-digest/content-generation/design.md#要約の分量を検証する処理(決定的なコード)
describe('要約(sections合計)の分量検証 - 1000〜1500字程度の「程度」を800〜1700字の許容幅として機械的に判定する', () => {
  it('body合計が下限の800字ちょうどのとき、有効と判定されること', () => {
    expect(isValidSummaryLength(makeSections([SUMMARY_TOTAL_MIN_LENGTH / 2, SUMMARY_TOTAL_MIN_LENGTH / 2]))).toBe(true)
  })

  it('body合計が上限の1700字ちょうどのとき、有効と判定されること', () => {
    expect(isValidSummaryLength(makeSections([SUMMARY_TOTAL_MAX_LENGTH / 2, SUMMARY_TOTAL_MAX_LENGTH / 2]))).toBe(true)
  })

  it('body合計が799字(下限未満)のとき、無効と判定されること', () => {
    const half = (SUMMARY_TOTAL_MIN_LENGTH - 1) / 2
    expect(isValidSummaryLength(makeSections([Math.ceil(half), Math.floor(half)]))).toBe(false)
  })

  it('body合計が1701字(上限超過)のとき、無効と判定されること', () => {
    const half = (SUMMARY_TOTAL_MAX_LENGTH + 1) / 2
    expect(isValidSummaryLength(makeSections([Math.ceil(half), Math.floor(half)]))).toBe(false)
  })

  it('複数セクションのbody合計が推奨レンジの中央付近(1200字)のとき、有効と判定されること', () => {
    expect(isValidSummaryLength(makeSections([400, 400, 400]))).toBe(true)
  })
})

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#要約-3、specs/ai-dev-digest/content-generation/design.md#要約の分量を検証する処理(決定的なコード)
describe('要約のセクション数検証 - 「複数のセクションに分けて構成する」は2件以上を必須とする制約であり目安ではない', () => {
  it('sectionsが1件(2件未満)のとき、body合計が範囲内でも無効と判定されること', () => {
    expect(isValidSummaryLength(makeSections([1000]))).toBe(false)
  })

  it('sectionsが0件のとき、無効と判定されること', () => {
    expect(isValidSummaryLength([])).toBe(false)
  })

  it('sectionsが2件でbody合計が範囲内のとき、有効と判定されること', () => {
    expect(isValidSummaryLength(makeSections([500, 500]))).toBe(true)
  })
})

// 仕様: specs/ai-dev-digest/content-generation/design.md#要約の分量を検証する処理(決定的なコード)
describe('要約のセクション内容検証 - 各セクションのheading/bodyが空文字でないことを確認する', () => {
  it('いずれかのセクションのheadingが空文字のとき、無効と判定されること', () => {
    const sections = [
      { heading: '', body: 'あ'.repeat(500) },
      { heading: '見出し2', body: 'あ'.repeat(500) },
    ]
    expect(isValidSummaryLength(sections)).toBe(false)
  })

  it('いずれかのセクションのbodyが空文字のとき、無効と判定されること', () => {
    const sections = [
      { heading: '見出し1', body: '' },
      { heading: '見出し2', body: 'あ'.repeat(1000) },
    ]
    expect(isValidSummaryLength(sections)).toBe(false)
  })
})
