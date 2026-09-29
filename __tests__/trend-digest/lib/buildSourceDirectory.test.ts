import { describe, it, expect } from 'vitest'
import { buildCriteriaText } from '../../../app/trend-digest/lib/buildSourceDirectory'
import type { GenreCriteria } from '../../../app/trend-digest/lib/watchlistTypes'

// 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-4、specs/trend-digest/source-directory/requirements.md#機能要件-6、specs/trend-digest/source-directory/design.md「採用基準を日本語にする処理」
describe('採用基準を日本語にする処理 - 採用基準の定義から表示用の文言を導出し、ジャンルごとの固定文をページに書き込まない', () => {
  it('上位何位以内かだけを持つ固定リストジャンルは「上位◯位以内」になること', () => {
    const criteria: GenreCriteria = { method: 'fixed-list', rankThreshold: 5 }
    expect(buildCriteriaText(criteria)).toBe('上位5位以内')
  })

  it('新規ランクインまたは順位上昇だけを持つ固定リストジャンルは「新規ランクイン、または順位上昇」になること', () => {
    const criteria: GenreCriteria = { method: 'fixed-list', newEntryOrRisingRank: true }
    expect(buildCriteriaText(criteria)).toBe('新規ランクイン、または順位上昇')
  })

  it('順位の改善幅もあわせて持つ固定リストジャンルは、改善幅を含む文言になること', () => {
    const criteria: GenreCriteria = {
      method: 'fixed-list',
      newEntryOrRisingRank: true,
      risingRankMinImprovement: 10,
    }
    expect(buildCriteriaText(criteria)).toBe('新規ランクイン、または順位が10位以上上昇')
  })

  it('上位何位以内か・新規ランクインまたは順位上昇の両方を持つジャンル(書籍・漫画)は「かつ」で結ばれた文言になること', () => {
    const criteria: GenreCriteria = {
      method: 'fixed-list',
      rankThreshold: 5,
      newEntryOrRisingRank: true,
    }
    const text = buildCriteriaText(criteria)
    expect(text).toContain('上位5位以内')
    expect(text).toContain('かつ')
    expect(text).toContain('新規ランクイン')
  })

  it('WebSearchジャンルは「独立した言及元が◯件以上」になること', () => {
    const criteria: GenreCriteria = { method: 'websearch', minIndependentSources: 3 }
    expect(buildCriteriaText(criteria)).toBe('独立した言及元が3件以上')
  })

  // 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-6、specs/trend-digest/source-directory/design.md「採用基準を日本語にする処理」
  it('併用ジャンル(hybrid)は「(固定リスト側の条件)、またはWebSearchで独立した言及元が◯件以上」というOR条件が伝わる文言になること', () => {
    const criteria: GenreCriteria = {
      method: 'hybrid',
      fixedList: { newEntryOrRisingRank: true },
      webSearch: { minIndependentSources: 3 },
    }
    const text = buildCriteriaText(criteria)
    expect(text).toContain('新規ランクイン、または順位上昇')
    expect(text).toContain('または')
    expect(text).toContain('WebSearch')
    expect(text).toContain('独立した言及元が3件以上')
  })

  // 仕様: specs/trend-digest/source-directory/requirements.md#機能要件-5
  it('採用基準の値(上位何位以内か)を変えると表示文も変わること(ジャンルごとの固定文を書き込んでいないことの回帰テスト)', () => {
    const before = buildCriteriaText({ method: 'fixed-list', rankThreshold: 5 })
    const after = buildCriteriaText({ method: 'fixed-list', rankThreshold: 10 })
    expect(before).not.toBe(after)
    expect(after).toBe('上位10位以内')
  })

  it('採用基準の値(独立言及元の最低件数)を変えると表示文も変わること(ジャンルごとの固定文を書き込んでいないことの回帰テスト)', () => {
    const before = buildCriteriaText({ method: 'websearch', minIndependentSources: 3 })
    const after = buildCriteriaText({ method: 'websearch', minIndependentSources: 5 })
    expect(before).not.toBe(after)
    expect(after).toBe('独立した言及元が5件以上')
  })
})
