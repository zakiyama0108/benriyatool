import { describe, it, expect, vi } from 'vitest'
import { classifyWebSearchResult, collectWebSearchCandidates } from '../../../app/trend-digest/lib/collectWebSearchCandidates'
import type { WebSearchCallFn } from '../../../app/trend-digest/lib/collectWebSearchCandidates'
import type { WatchlistEntry, WebSearchGenreCriteria } from '../../../app/trend-digest/lib/watchlistTypes'

const entry: WatchlistEntry = {
  genre: 'gourmet',
  edition: 'culture-lifestyle',
  label: 'グルメ',
  method: 'websearch',
  sources: [],
  searchHints: ['話題の飲食店'],
}

const criteria: WebSearchGenreCriteria = { method: 'websearch', minIndependentSources: 2 }

// 仕様: specs/trend-digest/content-selection/requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1
describe('WebSearchジャンルの応答分類 - 複数の独立した情報源が同じ話題を報じている場合のみ「動きがあった」候補にする', () => {
  it('JSON配列の応答から、独立情報源数がminIndependentSources以上の話題だけを候補にすること', async () => {
    const call: WebSearchCallFn = vi.fn().mockResolvedValue({
      result: JSON.stringify([
        { title: '話題の店A', sourceName: '〇〇ニュース', sourceUrl: 'https://example.com/a', independentSourceCount: 3 },
        { title: '噂の店B', sourceName: '△△ブログ', sourceUrl: 'https://example.com/b', independentSourceCount: 1 },
      ]),
    })
    const { candidates, ok } = await collectWebSearchCandidates(entry, criteria, call)
    expect(ok).toBe(true)
    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      genre: 'gourmet',
      title: '話題の店A',
      sourceName: '〇〇ニュース',
      sourceUrl: 'https://example.com/a',
      method: 'websearch',
      strength: 3,
    })
  })

  it('応答が空配列(動きがなかった)のとき、候補0件でok:trueになること', async () => {
    const call: WebSearchCallFn = vi.fn().mockResolvedValue({ result: '[]' })
    const { candidates, ok } = await collectWebSearchCandidates(entry, criteria, call)
    expect(ok).toBe(true)
    expect(candidates).toHaveLength(0)
  })

  it('検索・判定自体が失敗(is_error)した場合、そのジャンルは候補0件・ok:falseとして扱われ、他のジャンルの処理を止めないこと', async () => {
    const call: WebSearchCallFn = vi.fn().mockResolvedValue({ is_error: true, result: 'ヘッドレス実行エラー' })
    const { candidates, ok } = await collectWebSearchCandidates(entry, criteria, call)
    expect(ok).toBe(false)
    expect(candidates).toHaveLength(0)
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
