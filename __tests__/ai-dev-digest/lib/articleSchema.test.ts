import { describe, it, expect } from 'vitest'
import { parseArticle } from '../../../app/ai-dev-digest/lib/articleSchema'

function validTopic(overrides: Record<string, unknown> = {}) {
  return {
    id: 'topic-1',
    heading: 'Anthropicが新モデルを発表',
    summary: 'あ'.repeat(120),
    sourceType: 'official',
    sourceName: 'Anthropic',
    sourceUrl: 'https://www.anthropic.com/news/example',
    belowCriteria: false,
    ...overrides,
  }
}

function validArticle(overrides: Record<string, unknown> = {}) {
  return {
    date: '2026-08-01',
    topics: [validTopic()],
    ...overrides,
  }
}

// 仕様: specs/ai-dev-digest/article-detail/design.md#バリデーション
describe('記事データのスキーマ検証 - ビルド時にJSONの構造・内容を検証し、不正なデータでビルドを失敗させる', () => {
  it('1件のみのトピックを含む正常な記事データは検証を通ること', () => {
    const article = parseArticle(validArticle(), '2026-08-01.json')
    expect(article.date).toBe('2026-08-01')
    expect(article.topics).toHaveLength(1)
  })

  it('5件のトピックを含む正常な記事データ(上限件数)は検証を通ること', () => {
    const topics = Array.from({ length: 5 }, (_, i) => validTopic({ id: `topic-${i + 1}` }))
    const article = parseArticle(validArticle({ topics }), '2026-08-01.json')
    expect(article.topics).toHaveLength(5)
  })

  it('topicsが0件のとき、検証エラーになること', () => {
    expect(() => parseArticle(validArticle({ topics: [] }), '2026-08-01.json')).toThrow()
  })

  it('topicsが6件(上限超過)のとき、検証エラーになること', () => {
    const topics = Array.from({ length: 6 }, (_, i) => validTopic({ id: `topic-${i + 1}` }))
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('sourceTypeが定義済み種別以外のとき、検証エラーになること', () => {
    const topics = [validTopic({ sourceType: 'twitter' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('belowCriteriaがtrueなのにbelowCriteriaReasonが無いとき、検証エラーになること', () => {
    const topics = [validTopic({ belowCriteria: true })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('belowCriteriaがtrueでbelowCriteriaReasonもあるとき、検証を通ること', () => {
    const topics = [validTopic({ belowCriteria: true, belowCriteriaReason: 'いいね数18件(基準30件に11件不足)' })]
    const article = parseArticle(validArticle({ topics }), '2026-08-01.json')
    expect(article.topics[0].belowCriteriaReason).toBe('いいね数18件(基準30件に11件不足)')
  })

  it('dateがファイル名と一致しないとき、検証エラーになること', () => {
    expect(() => parseArticle(validArticle({ date: '2026-08-02' }), '2026-08-01.json')).toThrow()
  })

  it('id・heading・summary・sourceName・sourceUrlのいずれかが空文字のとき、検証エラーになること', () => {
    const topics = [validTopic({ heading: '' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('sourceUrlがhttp/https以外のスキーム(javascript:等)のとき、検証エラーになること', () => {
    const topics = [validTopic({ sourceUrl: 'javascript:alert(1)' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('記事内でid(topic識別子)が重複しているとき、検証エラーになること', () => {
    const topics = [validTopic({ id: 'topic-1' }), validTopic({ id: 'topic-1' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/design.md#バリデーション、specs/ai-dev-digest/content-generation/requirements.md#要約-2
describe('記事スキーマへの要約文字数検証の組み込み - isValidSummaryLengthで80〜170字の範囲外を拒否する', () => {
  it('要約が79字(下限未満)のトピックを含む記事データは検証エラーになること', () => {
    const topics = [validTopic({ summary: 'あ'.repeat(79) })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('要約が171字(上限超過)のトピックを含む記事データは検証エラーになること', () => {
    const topics = [validTopic({ summary: 'あ'.repeat(171) })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })
})
