import { describe, it, expect } from 'vitest'
import { parseArticle } from '../../../app/ai-dev-digest/lib/articleSchema'

function validSections(overrides: Record<string, unknown>[] = []) {
  if (overrides.length > 0) return overrides
  return [
    { heading: '何が発表されたか', body: 'あ'.repeat(500) },
    { heading: '開発者への影響', body: 'い'.repeat(500) },
  ]
}

function validTopic(overrides: Record<string, unknown> = {}) {
  return {
    id: 'topic-1',
    heading: 'Anthropicが新モデルを発表',
    sections: validSections(),
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

  it('id・heading・sourceName・sourceUrlのいずれかが空文字のとき、検証エラーになること', () => {
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

// 仕様: specs/ai-dev-digest/article-detail/design.md#バリデーション、specs/ai-dev-digest/content-generation/requirements.md#要約-3
describe('記事スキーマへのセクション数検証の組み込み - sectionsが2件未満、またはheading/bodyが空文字のトピックを拒否する', () => {
  it('sectionsが1件(2件未満)のとき、検証エラーになること', () => {
    const topics = [validTopic({ sections: [{ heading: '見出し', body: 'あ'.repeat(1000) }] })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('セクションのheadingが空文字のとき、検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '', body: 'あ'.repeat(500) },
          { heading: '見出し2', body: 'い'.repeat(500) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('セクションのbodyが空文字のとき、検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '見出し1', body: '' },
          { heading: '見出し2', body: 'い'.repeat(1000) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/design.md#バリデーション、specs/ai-dev-digest/content-generation/requirements.md#要約-2
describe('記事スキーマへの要約分量検証の組み込み - isValidSummaryLengthでsections合計800〜1700字の範囲外を拒否する', () => {
  it('sectionsのbody合計が799字(下限未満)のトピックを含む記事データは検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '見出し1', body: 'あ'.repeat(400) },
          { heading: '見出し2', body: 'い'.repeat(399) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('sectionsのbody合計が1701字(上限超過)のトピックを含む記事データは検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '見出し1', body: 'あ'.repeat(900) },
          { heading: '見出し2', body: 'い'.repeat(801) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })
})
