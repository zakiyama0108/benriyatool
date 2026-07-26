import { describe, it, expect } from 'vitest'
import { CONTEXT_HELP_TEXT, USAGE_BANNER_STEPS, GLOSSARY_TERMS } from '../../../app/life-money-sim/lib/usageGuideContent'
import type { HelpCardId } from '../../../app/life-money-sim/lib/usageGuideContent'

// 対象9カードのID一覧(design.md#コンテキストヘルプの開閉を制御する処理で列挙される9枚のカードに対応)
const ALL_HELP_CARD_IDS: HelpCardId[] = [
  'income',
  'personalExpense',
  'household',
  'balanceSummary',
  'startingAsset',
  'familyProfile',
  'investmentMode',
  'eventBonus',
  'assetProjection',
]

// 仕様: specs/life-money-sim/usage-guide/requirements.md#コンテキストヘルプの文言
describe('コンテキストヘルプの文言定義 - 9枚のカードすべてに説明文言が対応付けられている', () => {
  it('対象9カードのIDすべてにCONTEXT_HELP_TEXTの説明文言が定義されていること(対応漏れがないこと)', () => {
    for (const id of ALL_HELP_CARD_IDS) {
      expect(typeof CONTEXT_HELP_TEXT[id]).toBe('string')
      expect(CONTEXT_HELP_TEXT[id].length).toBeGreaterThan(0)
    }
  })

  it('CONTEXT_HELP_TEXTのキー数が対象カード数(9件)と一致すること(余分・不足がないこと)', () => {
    expect(Object.keys(CONTEXT_HELP_TEXT)).toHaveLength(9)
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#使い方バナーの文言
describe('使い方バナーの文言定義 - 3ステップの操作ガイドが順番どおり定義されている', () => {
  it('USAGE_BANNER_STEPSが3件定義され、各ステップにタイトルと説明文言が両方あること', () => {
    expect(USAGE_BANNER_STEPS).toHaveLength(3)
    for (const step of USAGE_BANNER_STEPS) {
      expect(step.title.length).toBeGreaterThan(0)
      expect(step.text.length).toBeGreaterThan(0)
    }
  })

  it('①→②→③の順番どおりに並んでいること', () => {
    expect(USAGE_BANNER_STEPS.map((s) => s.title[0])).toEqual(['①', '②', '③'])
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#用語集の文言
describe('用語集の文言定義 - 本ツール特有の4用語とその説明が定義されている', () => {
  it('GLOSSARY_TERMSが4件定義され、各用語に用語名と説明文言が両方あること', () => {
    expect(GLOSSARY_TERMS).toHaveLength(4)
    for (const entry of GLOSSARY_TERMS) {
      expect(entry.term.length).toBeGreaterThan(0)
      expect(entry.text.length).toBeGreaterThan(0)
    }
  })

  it('掲載する用語が「差引後余剰」「貯蓄のみモード」「資産運用モード」「マイシナリオ」の4つであること', () => {
    expect(GLOSSARY_TERMS.map((t) => t.term)).toEqual(['差引後余剰', '貯蓄のみモード', '資産運用モード', 'マイシナリオ'])
  })
})
