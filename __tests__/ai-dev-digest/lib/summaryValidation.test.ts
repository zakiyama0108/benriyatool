import { describe, it, expect } from 'vitest'
import {
  TEASER_MIN_LENGTH,
  TEASER_MAX_LENGTH,
  DETAIL_TOTAL_MIN_LENGTH,
  DETAIL_TOTAL_MAX_LENGTH,
  isValidTeaserLength,
  isValidDetailLength,
} from '../../../app/ai-dev-digest/lib/summaryValidation'
import type { SummarySection } from '../../../app/ai-dev-digest/lib/types'

// 有効な範囲(40〜140字)のteaserを持つセクションを生成する(detail合計の分量検証に集中するため)
function makeSections(detailLengths: number[]): SummarySection[] {
  return detailLengths.map((length, index) => ({
    heading: `見出し${index + 1}`,
    teaser: 'あ'.repeat(60),
    detail: 'い'.repeat(length),
  }))
}

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#要約-3、specs/ai-dev-digest/content-generation/design.md#要約の分量を検証する処理(決定的なコード)
describe('導入文(teaser)の分量検証 - 60〜120字程度の「程度」を40〜140字の許容幅として機械的に判定する', () => {
  it('teaserが下限の40字ちょうどのとき、有効と判定されること', () => {
    expect(isValidTeaserLength('あ'.repeat(TEASER_MIN_LENGTH))).toBe(true)
  })

  it('teaserが上限の140字ちょうどのとき、有効と判定されること', () => {
    expect(isValidTeaserLength('あ'.repeat(TEASER_MAX_LENGTH))).toBe(true)
  })

  it('teaserが39字(下限未満)のとき、無効と判定されること', () => {
    expect(isValidTeaserLength('あ'.repeat(TEASER_MIN_LENGTH - 1))).toBe(false)
  })

  it('teaserが141字(上限超過)のとき、無効と判定されること', () => {
    expect(isValidTeaserLength('あ'.repeat(TEASER_MAX_LENGTH + 1))).toBe(false)
  })

  it('teaserが推奨レンジの中央付近(80字)のとき、有効と判定されること', () => {
    expect(isValidTeaserLength('あ'.repeat(80))).toBe(true)
  })
})

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#要約-4、specs/ai-dev-digest/content-generation/requirements.md#著作権への配慮(根拠)-3、specs/ai-dev-digest/article-detail/requirements.md#表示分量・著作権配慮-1、specs/ai-dev-digest/content-generation/design.md#要約の分量を検証する処理(決定的なコード)
describe('詳細文(detail)合計の分量検証 - 1000〜1500字程度の「程度」を800〜1700字の許容幅として機械的に判定する', () => {
  it('detail合計が下限の800字ちょうどのとき、有効と判定されること', () => {
    expect(isValidDetailLength(makeSections([DETAIL_TOTAL_MIN_LENGTH / 2, DETAIL_TOTAL_MIN_LENGTH / 2]))).toBe(true)
  })

  it('detail合計が上限の1700字ちょうどのとき、有効と判定されること', () => {
    expect(isValidDetailLength(makeSections([DETAIL_TOTAL_MAX_LENGTH / 2, DETAIL_TOTAL_MAX_LENGTH / 2]))).toBe(true)
  })

  it('detail合計が799字(下限未満)のとき、無効と判定されること', () => {
    const half = (DETAIL_TOTAL_MIN_LENGTH - 1) / 2
    expect(isValidDetailLength(makeSections([Math.ceil(half), Math.floor(half)]))).toBe(false)
  })

  it('detail合計が1701字(上限超過)のとき、無効と判定されること', () => {
    const half = (DETAIL_TOTAL_MAX_LENGTH + 1) / 2
    expect(isValidDetailLength(makeSections([Math.ceil(half), Math.floor(half)]))).toBe(false)
  })

  it('複数セクションのdetail合計が推奨レンジの中央付近(1200字)のとき、有効と判定されること', () => {
    expect(isValidDetailLength(makeSections([400, 400, 400]))).toBe(true)
  })
})

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#要約-5、specs/ai-dev-digest/content-generation/design.md#要約の分量を検証する処理(決定的なコード)
describe('要約のセクション数検証 - 「複数のセクションに分けて構成する」は2件以上を必須とする制約であり目安ではない', () => {
  it('sectionsが1件(2件未満)のとき、detail合計が範囲内でも無効と判定されること', () => {
    expect(isValidDetailLength(makeSections([1000]))).toBe(false)
  })

  it('sectionsが0件のとき、無効と判定されること', () => {
    expect(isValidDetailLength([])).toBe(false)
  })

  it('sectionsが2件でdetail合計が範囲内のとき、有効と判定されること', () => {
    expect(isValidDetailLength(makeSections([500, 500]))).toBe(true)
  })
})

// 仕様: specs/ai-dev-digest/content-generation/design.md#要約の分量を検証する処理(決定的なコード)
describe('要約のセクション内容検証 - 各セクションのheading/teaser/detailが空文字でないことを確認する', () => {
  it('いずれかのセクションのheadingが空文字のとき、無効と判定されること', () => {
    const sections: SummarySection[] = [
      { heading: '', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
      { heading: '見出し2', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
    ]
    expect(isValidDetailLength(sections)).toBe(false)
  })

  it('いずれかのセクションのteaserが空文字のとき、無効と判定されること', () => {
    const sections: SummarySection[] = [
      { heading: '見出し1', teaser: '', detail: 'あ'.repeat(500) },
      { heading: '見出し2', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
    ]
    expect(isValidDetailLength(sections)).toBe(false)
  })

  it('いずれかのセクションのdetailが空文字のとき、無効と判定されること', () => {
    const sections: SummarySection[] = [
      { heading: '見出し1', teaser: 'あ'.repeat(60), detail: '' },
      { heading: '見出し2', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(1000) },
    ]
    expect(isValidDetailLength(sections)).toBe(false)
  })
})
