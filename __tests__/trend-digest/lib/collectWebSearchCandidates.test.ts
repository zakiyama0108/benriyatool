import { describe, it, expect, vi } from 'vitest'
import { classifyWebSearchResult, collectWebSearchCandidates, resolveWebSearchCriteria } from '../../../app/trend-digest/lib/collectWebSearchCandidates'
import type { WebSearchCallFn } from '../../../app/trend-digest/lib/collectWebSearchCandidates'
import type { WatchlistEntry, WebSearchGenreCriteria, GenreCriteria } from '../../../app/trend-digest/lib/watchlistTypes'

const MAX_OBSERVATIONS_PER_SOURCE = 30

const entry: WatchlistEntry = {
  genre: 'gourmet',
  edition: 'culture-lifestyle',
  label: 'グルメ',
  method: 'websearch',
  sources: [],
  searchHints: ['話題の飲食店'],
}

const criteria: WebSearchGenreCriteria = { method: 'websearch', minIndependentSources: 3 }

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1、specs/trend-digest/content-selection/requirements.md#機能要件-3
describe('WebSearchジャンルの応答分類 - 独立情報源数がminIndependentSources未満の話題も観測項目として保持し、meetsCriteriaで候補かどうかを区別する', () => {
  it('JSON配列の応答から、独立情報源数がminIndependentSources以上の話題はmeetsCriteria: trueになり、未満の話題はmeetsCriteria: falseとして観測項目に残ること', async () => {
    const call: WebSearchCallFn = vi.fn().mockResolvedValue({
      result: JSON.stringify([
        { title: '話題の店A', sourceName: '〇〇ニュース', sourceUrl: 'https://example.com/a', independentSourceCount: 3 },
        { title: '噂の店B', sourceName: '△△ブログ', sourceUrl: 'https://example.com/b', independentSourceCount: 1 },
      ]),
    })
    const { observations, ok } = await collectWebSearchCandidates(entry, criteria, call, MAX_OBSERVATIONS_PER_SOURCE)
    expect(ok).toBe(true)
    expect(observations).toHaveLength(2)
    expect(observations.find((o) => o.title === '話題の店A')).toMatchObject({
      genre: 'gourmet',
      sourceName: '〇〇ニュース',
      sourceUrl: 'https://example.com/a',
      method: 'websearch',
      strength: 3,
      rank: null,
      meetsCriteria: true,
    })
    expect(observations.find((o) => o.title === '噂の店B')).toMatchObject({ strength: 1, meetsCriteria: false })
  })

  it('応答が空配列(動きがなかった)のとき、観測項目0件でok:trueになること', async () => {
    const call: WebSearchCallFn = vi.fn().mockResolvedValue({ result: '[]' })
    const { observations, ok } = await collectWebSearchCandidates(entry, criteria, call, MAX_OBSERVATIONS_PER_SOURCE)
    expect(ok).toBe(true)
    expect(observations).toHaveLength(0)
  })

  it('検索・判定自体が失敗(is_error)した場合、そのジャンルは観測項目0件・ok:falseとして扱われ、他のジャンルの処理を止めないこと', async () => {
    const call: WebSearchCallFn = vi.fn().mockResolvedValue({ is_error: true, result: 'ヘッドレス実行エラー' })
    const { observations, ok } = await collectWebSearchCandidates(entry, criteria, call, MAX_OBSERVATIONS_PER_SOURCE)
    expect(ok).toBe(false)
    expect(observations).toHaveLength(0)
  })

  it('言及元の内訳(breakdown)が応答に含まれる場合、観測項目のnoteとして使われること', async () => {
    const call: WebSearchCallFn = vi.fn().mockResolvedValue({
      result: JSON.stringify([
        {
          title: '話題の店C',
          sourceName: '〇〇ニュース',
          sourceUrl: 'https://example.com/c',
          independentSourceCount: 3,
          breakdown: 'ニュースメディア2件+SNS言及1件',
        },
      ]),
    })
    const { observations } = await collectWebSearchCandidates(entry, criteria, call, MAX_OBSERVATIONS_PER_SOURCE)
    expect(observations[0].note).toBe('ニュースメディア2件+SNS言及1件')
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#機能要件-3
describe('観測項目の記録上限 - 見つかった話題が多い場合でも上位maxObservationsPerSource件までを観測項目として記録する', () => {
  it('応答の話題数がmaxObservationsPerSourceを超える場合、先頭から上限件数までだけが観測項目になること', async () => {
    const topics = Array.from({ length: 5 }, (_, i) => ({
      title: `話題${i + 1}`,
      sourceName: '媒体',
      sourceUrl: `https://example.com/${i + 1}`,
      independentSourceCount: 3,
    }))
    const call: WebSearchCallFn = vi.fn().mockResolvedValue({ result: JSON.stringify(topics) })
    const { observations } = await collectWebSearchCandidates(entry, criteria, call, 2)
    expect(observations.map((o) => o.title)).toEqual(['話題1', '話題2'])
  })
})

// 仕様: specs/trend-digest/content-selection/design.md「WebSearchジャンルの候補を収集・判定する処理(エージェントの推論)」
describe('WebSearchジャンルの応答分類 - 応答がJSON配列単体以外(説明文・不正な形式)の場合は失敗として扱う', () => {
  it('応答からJSON配列を抽出できない場合、failedになること', () => {
    const classified = classifyWebSearchResult({ result: 'すみません、判断できませんでした' })
    expect(classified.kind).toBe('failed')
  })

  it('前後に説明文が付いていてもJSON配列部分を抽出して分類できること', () => {
    const classified = classifyWebSearchResult({
      result: '以下が結果です:\n[{"title":"話題A","sourceName":"媒体","sourceUrl":"https://example.com/x","independentSourceCount":2}]\n以上です',
    })
    expect(classified.kind).toBe('ok')
    if (classified.kind === 'ok') expect(classified.topics).toHaveLength(1)
  })

  it('必須フィールドが欠けている・型が不正な要素は無視され、有効な要素のみ残ること', () => {
    const classified = classifyWebSearchResult({
      result: JSON.stringify([
        { title: '', sourceName: '媒体', sourceUrl: 'https://example.com/x', independentSourceCount: 2 },
        { title: '有効な話題', sourceName: '媒体', sourceUrl: 'not-a-url', independentSourceCount: 2 },
        { title: '有効な話題2', sourceName: '媒体', sourceUrl: 'https://example.com/y', independentSourceCount: 0 },
        { title: '有効な話題3', sourceName: '媒体', sourceUrl: 'https://example.com/z', independentSourceCount: 2 },
      ]),
    })
    expect(classified.kind).toBe('ok')
    if (classified.kind === 'ok') {
      expect(classified.topics.map((t) => t.title)).toEqual(['有効な話題3'])
    }
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#選定方式-7
describe('WebSearch側の採用基準の解決(resolveWebSearchCriteria) - 併用ジャンル(hybrid)はgenreCriteria.webSearchを、WebSearchジャンルはそのままの基準を使う', () => {
  it('method: websearchのジャンルは、そのままの基準が返ること', () => {
    const genreCriteria: GenreCriteria = { method: 'websearch', minIndependentSources: 3 }
    expect(resolveWebSearchCriteria(genreCriteria, 'gourmet')).toEqual({ method: 'websearch', minIndependentSources: 3 })
  })

  it('method: hybridのジャンル(アニメ)は、genreCriteria.webSearchからmethod: websearchの基準が組み立てられること', () => {
    const genreCriteria: GenreCriteria = {
      method: 'hybrid',
      fixedList: { newEntryOrRisingRank: true },
      webSearch: { minIndependentSources: 3 },
    }
    expect(resolveWebSearchCriteria(genreCriteria, 'anime')).toEqual({ method: 'websearch', minIndependentSources: 3 })
  })

  it('method: fixed-listのジャンルはWebSearch側の基準を持たないため、例外を投げること(hybridでは例外を投げないこととの対比)', () => {
    const genreCriteria: GenreCriteria = { method: 'fixed-list', rankThreshold: 5 }
    expect(() => resolveWebSearchCriteria(genreCriteria, 'music')).toThrow()
  })
})
