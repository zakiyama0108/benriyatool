import { describe, it, expect } from 'vitest'
import {
  TEASER_MIN_LENGTH,
  TEASER_MAX_LENGTH,
  DETAIL_TOTAL_MIN_LENGTH,
  DETAIL_TOTAL_MAX_LENGTH,
  isValidTeaserLength,
  isValidDetailLength,
  isValidSummaryDetailLength,
  isValidImportance,
} from '../../../app/ai-dev-digest/lib/summaryValidation'
import type { SummarySection, TopicSummary } from '../../../app/ai-dev-digest/lib/types'

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

// 有効な4観点(teaser・detailとも有効範囲)のTopicSummaryを、指定した観点だけ上書きして生成する
function makeSummary(overrides: Partial<TopicSummary> = {}): TopicSummary {
  const perspective = (prefix: string, detailLength = 250) => ({
    heading: `${prefix}見出し`,
    teaser: prefix.repeat(60),
    detail: prefix.repeat(detailLength),
  })
  return {
    benefit: perspective('あ'),
    whatsNew: perspective('い'),
    how: perspective('う'),
    howToUse: perspective('え'),
    ...overrides,
  }
}

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#要約-2、specs/ai-dev-digest/content-generation/requirements.md#要約-3、specs/ai-dev-digest/content-generation/requirements.md#要約-4、specs/ai-dev-digest/content-generation/requirements.md#要約-5、specs/ai-dev-digest/content-generation/design.md#要約の分量を検証する処理(決定的なコード)
describe('固定4観点(TopicSummary)の分量検証 - 4キーの存在・各観点teaserの範囲・4観点detail合計の範囲を確認する', () => {
  it('4観点すべてが有効範囲のとき、有効と判定されること', () => {
    expect(isValidSummaryDetailLength(makeSummary())).toBe(true)
  })

  it('benefit/whatsNew/how/howToUseのいずれかのキーが欠けているとき、無効と判定されること', () => {
    const summary = makeSummary() as Partial<TopicSummary>
    delete summary.whatsNew
    expect(isValidSummaryDetailLength(summary as TopicSummary)).toBe(false)
  })

  it('いずれかの観点のheadingが空文字のとき、無効と判定されること', () => {
    const summary = makeSummary({ how: { heading: '', teaser: 'う'.repeat(60), detail: 'う'.repeat(250) } })
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('いずれかの観点のteaserが空文字のとき、無効と判定されること', () => {
    const summary = makeSummary({ how: { heading: '仕組み', teaser: '', detail: 'う'.repeat(250) } })
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('いずれかの観点のdetailが空文字のとき、無効と判定されること', () => {
    const summary = makeSummary({ how: { heading: '仕組み', teaser: 'う'.repeat(60), detail: '' } })
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('いずれかの観点のteaserが39字(下限未満)のとき、無効と判定されること', () => {
    const summary = makeSummary({
      benefit: { heading: 'メリット', teaser: 'あ'.repeat(TEASER_MIN_LENGTH - 1), detail: 'あ'.repeat(250) },
    })
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('いずれかの観点のteaserが141字(上限超過)のとき、無効と判定されること', () => {
    const summary = makeSummary({
      benefit: { heading: 'メリット', teaser: 'あ'.repeat(TEASER_MAX_LENGTH + 1), detail: 'あ'.repeat(250) },
    })
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('4観点のdetail合計が下限の800字ちょうどのとき、有効と判定されること', () => {
    const len = DETAIL_TOTAL_MIN_LENGTH / 4
    const summary = makeSummary({
      benefit: { heading: 'a', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(len) },
      whatsNew: { heading: 'b', teaser: 'い'.repeat(60), detail: 'い'.repeat(len) },
      how: { heading: 'c', teaser: 'う'.repeat(60), detail: 'う'.repeat(len) },
      howToUse: { heading: 'd', teaser: 'え'.repeat(60), detail: 'え'.repeat(len) },
    })
    expect(isValidSummaryDetailLength(summary)).toBe(true)
  })

  it('4観点のdetail合計が上限の1700字ちょうどのとき、有効と判定されること', () => {
    const len = DETAIL_TOTAL_MAX_LENGTH / 4
    const summary = makeSummary({
      benefit: { heading: 'a', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(len) },
      whatsNew: { heading: 'b', teaser: 'い'.repeat(60), detail: 'い'.repeat(len) },
      how: { heading: 'c', teaser: 'う'.repeat(60), detail: 'う'.repeat(len) },
      howToUse: { heading: 'd', teaser: 'え'.repeat(60), detail: 'え'.repeat(len) },
    })
    expect(isValidSummaryDetailLength(summary)).toBe(true)
  })

  it('4観点のdetail合計が799字(下限未満)のとき、無効と判定されること', () => {
    const len = (DETAIL_TOTAL_MIN_LENGTH - 1) / 4
    const summary = makeSummary({
      benefit: { heading: 'a', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(Math.ceil(len)) },
      whatsNew: { heading: 'b', teaser: 'い'.repeat(60), detail: 'い'.repeat(Math.floor(len)) },
      how: { heading: 'c', teaser: 'う'.repeat(60), detail: 'う'.repeat(Math.floor(len)) },
      howToUse: { heading: 'd', teaser: 'え'.repeat(60), detail: 'え'.repeat(Math.floor(len)) },
    })
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })

  it('4観点のdetail合計が1701字(上限超過)のとき、無効と判定されること', () => {
    const len = (DETAIL_TOTAL_MAX_LENGTH + 1) / 4
    const summary = makeSummary({
      benefit: { heading: 'a', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(Math.ceil(len)) },
      whatsNew: { heading: 'b', teaser: 'い'.repeat(60), detail: 'い'.repeat(Math.floor(len)) },
      how: { heading: 'c', teaser: 'う'.repeat(60), detail: 'う'.repeat(Math.floor(len)) },
      howToUse: { heading: 'd', teaser: 'え'.repeat(60), detail: 'え'.repeat(Math.floor(len)) },
    })
    expect(isValidSummaryDetailLength(summary)).toBe(false)
  })
})

// 仕様: specs/ai-dev-digest/content-generation/requirements.md#重要度(2026-08追加)-13
describe('重要度(importance)の検証 - 1〜5の整数であることを確認する', () => {
  it.each([1, 2, 3, 4, 5])('importanceが%iのとき、有効と判定されること', (value) => {
    expect(isValidImportance(value)).toBe(true)
  })

  it('importanceが0(下限未満)のとき、無効と判定されること', () => {
    expect(isValidImportance(0)).toBe(false)
  })

  it('importanceが6(上限超過)のとき、無効と判定されること', () => {
    expect(isValidImportance(6)).toBe(false)
  })

  it('importanceが小数(3.5)のとき、無効と判定されること', () => {
    expect(isValidImportance(3.5)).toBe(false)
  })

  it('importanceが文字列("4")のとき、無効と判定されること', () => {
    expect(isValidImportance('4')).toBe(false)
  })

  it('importanceがundefinedのとき、無効と判定されること', () => {
    expect(isValidImportance(undefined)).toBe(false)
  })
})
