import { describe, it, expect } from 'vitest'
import { parseArticle } from '../../../app/trend-digest/lib/articleSchema'

// body文字数の範囲(160〜480字)を満たすダミー本文を作る
function makeBody(length = 250): string {
  return 'あ'.repeat(length)
}

function makeTopic(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'topic-1',
    genre: 'music',
    heading: '見出し',
    body: makeBody(),
    sourceTitle: '対象作品名',
    sourceName: 'Oricon',
    sourceUrl: 'https://example.com/a',
    ...overrides,
  }
}

function makeArticle(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: '2026-09-15-entertainment',
    edition: 'entertainment',
    date: '2026-09-15',
    topics: [makeTopic()],
    ...overrides,
  }
}

// 仕様: specs/trend-digest/article-detail/design.md#バリデーション、specs/trend-digest/article-detail/requirements.md#記事本文表示-4、specs/trend-digest/article-detail/requirements.md#表示分量・著作権配慮-2、specs/trend-digest/content-generation/requirements.md#要約-1、specs/trend-digest/content-generation/requirements.md#要約-2、specs/trend-digest/content-generation/requirements.md#要約-4、specs/trend-digest/content-generation/requirements.md#記事の構成-5、specs/trend-digest/content-generation/design.md#本文の分量を検証する処理(決定的なコード)
describe('記事データのバリデーション - JSONのスキーマを検証し、違反時は例外を投げる', () => {
  it('正常な記事データ(トピック1件のみ)は検証を通り、そのままArticleとして返ること', () => {
    const article = parseArticle(makeArticle(), '2026-09-15-entertainment.json')
    expect(article.id).toBe('2026-09-15-entertainment')
    expect(article.topics).toHaveLength(1)
  })

  it('正常な記事データ(複数ジャンル・複数トピック)は検証を通ること', () => {
    const article = parseArticle(
      makeArticle({
        topics: [
          makeTopic({ id: 'topic-1', genre: 'music' }),
          makeTopic({ id: 'topic-2', genre: 'music' }),
          makeTopic({ id: 'topic-3', genre: 'anime' }),
        ],
      }),
      '2026-09-15-entertainment.json'
    )
    expect(article.topics).toHaveLength(3)
  })

  it('topicsが0件の場合、失敗すること', () => {
    expect(() => parseArticle(makeArticle({ topics: [] }), '2026-09-15-entertainment.json')).toThrow()
  })

  it('topicsが11件の場合、失敗すること(全ジャンル合計最大10件)', () => {
    const topics = Array.from({ length: 11 }, (_, i) => makeTopic({ id: `topic-${i + 1}`, genre: 'music' }))
    // 同一ジャンル3件以上の制約に触れないよう、9ジャンルへ分散させつつ11件用意する
    const genres = ['music', 'japanese-movie', 'foreign-movie', 'japanese-drama', 'foreign-drama', 'anime', 'variety', 'streaming-video', 'books-comics']
    const distributed = topics.map((t, i) => ({ ...t, genre: genres[i % genres.length] }))
    expect(() => parseArticle(makeArticle({ topics: distributed }), '2026-09-15-entertainment.json')).toThrow()
  })

  it('同一ジャンルのトピックが3件以上存在する場合、失敗すること(最大2件/ジャンル)', () => {
    const topics = [
      makeTopic({ id: 'topic-1', genre: 'music' }),
      makeTopic({ id: 'topic-2', genre: 'music' }),
      makeTopic({ id: 'topic-3', genre: 'music' }),
    ]
    expect(() => parseArticle(makeArticle({ topics }), '2026-09-15-entertainment.json')).toThrow()
  })

  it('genreが未定義値の場合、失敗すること', () => {
    const article = makeArticle({ topics: [makeTopic({ genre: 'unknown-genre' })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('genreは定義済みジャンルだが、article.editionに対応する9ジャンルに属さない場合、失敗すること(例: entertainment編にgourmet(culture-lifestyle専用)が混入)', () => {
    const article = makeArticle({ edition: 'entertainment', topics: [makeTopic({ genre: 'gourmet' })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('idがファイル名と一致しない場合、失敗すること', () => {
    const article = makeArticle({ id: '2026-09-15-entertainment' })
    expect(() => parseArticle(article, '2026-09-16-entertainment.json')).toThrow()
  })

  it('editionが不正値の場合、失敗すること', () => {
    const article = makeArticle({ edition: 'invalid-edition' })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('sourceUrlがhttp/httpsで始まらない場合、失敗すること', () => {
    const article = makeArticle({ topics: [makeTopic({ sourceUrl: 'javascript:alert(1)' })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it.each(['heading', 'body', 'sourceTitle', 'sourceName', 'sourceUrl'])(
    '%sが空文字の場合、失敗すること',
    (field) => {
      const article = makeArticle({ topics: [makeTopic({ [field]: '' })] })
      expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
    }
  )

  it('bodyの文字数が160字未満の場合、失敗すること', () => {
    const article = makeArticle({ topics: [makeTopic({ body: makeBody(159) })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('bodyの文字数が480字を超える場合、失敗すること', () => {
    const article = makeArticle({ topics: [makeTopic({ body: makeBody(481) })] })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('dateがYYYY-MM-DD形式でない場合、失敗すること', () => {
    const article = makeArticle({ date: '2026/09/15' })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })

  it('topics内でidが重複する場合、失敗すること', () => {
    const article = makeArticle({
      topics: [makeTopic({ id: 'topic-1', genre: 'music' }), makeTopic({ id: 'topic-1', genre: 'anime' })],
    })
    expect(() => parseArticle(article, '2026-09-15-entertainment.json')).toThrow()
  })
})
