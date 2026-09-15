import { describe, it, expect } from 'vitest'
import { parseArticle } from '../../../app/news-digest/lib/articleSchema'

function validSummary(overrides: Record<string, unknown> = {}) {
  const perspective = (prefix: string) => ({
    heading: `${prefix}見出し`,
    teaser: prefix.repeat(60),
    detail: prefix.repeat(250),
  })
  return {
    whatHappened: perspective('あ'),
    whyItMatters: perspective('い'),
    background: perspective('う'),
    outlook: perspective('え'),
    ...overrides,
  }
}

function validTopic(overrides: Record<string, unknown> = {}) {
  return {
    id: 'topic-1',
    heading: '保育料の一部が来年度から無償化される',
    category: 'general',
    summary: validSummary(),
    importance: 4,
    sourceName: 'NHK NEWS WEB',
    sourceUrl: 'https://www3.nhk.or.jp/news/example.html',
    sourcePublishedAt: '2026-09-08T10:00:00Z',
    belowCriteria: false,
    ...overrides,
  }
}

function validArticle(overrides: Record<string, unknown> = {}) {
  return {
    date: '2026-09-09',
    topics: [validTopic()],
    ...overrides,
  }
}

// 仕様: specs/news-digest/article-detail/design.md#バリデーション
describe('記事データのスキーマ検証 - ビルド時にJSONの構造・内容を検証し、不正なデータでビルドを失敗させる', () => {
  it('1件のみのトピックを含む正常な記事データは検証を通ること', () => {
    const article = parseArticle(validArticle(), '2026-09-09.json')
    expect(article.date).toBe('2026-09-09')
    expect(article.topics).toHaveLength(1)
  })

  it('7件のトピックを含む正常な記事データ(上限件数)は検証を通ること', () => {
    const topics = Array.from({ length: 7 }, (_, i) => validTopic({ id: `topic-${i + 1}` }))
    const article = parseArticle(validArticle({ topics }), '2026-09-09.json')
    expect(article.topics).toHaveLength(7)
  })

  it('topicsが0件のとき、検証エラーになること', () => {
    expect(() => parseArticle(validArticle({ topics: [] }), '2026-09-09.json')).toThrow()
  })

  it('topicsが8件(上限超過)のとき、検証エラーになること', () => {
    const topics = Array.from({ length: 8 }, (_, i) => validTopic({ id: `topic-${i + 1}` }))
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('categoryが未定義の値のとき、検証エラーになること', () => {
    const topics = [validTopic({ category: 'sports' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('belowCriteriaがtrueなのにbelowCriteriaReasonが無いとき、検証エラーになること', () => {
    const topics = [validTopic({ belowCriteria: true })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('belowCriteriaがtrueでbelowCriteriaReasonもあるとき、検証を通ること', () => {
    const topics = [validTopic({ belowCriteria: true, belowCriteriaReason: '裏付けメディアが1社のみ' })]
    const article = parseArticle(validArticle({ topics }), '2026-09-09.json')
    expect(article.topics[0].belowCriteriaReason).toBe('裏付けメディアが1社のみ')
  })

  it('dateがファイル名と一致しないとき、検証エラーになること', () => {
    expect(() => parseArticle(validArticle({ date: '2026-09-10' }), '2026-09-09.json')).toThrow()
  })

  it('id・heading・sourceName・sourceUrlのいずれかが空文字のとき、検証エラーになること', () => {
    const topics = [validTopic({ heading: '' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('sourceUrlがhttp/https以外のスキーム(javascript:等)のとき、検証エラーになること', () => {
    const topics = [validTopic({ sourceUrl: 'javascript:alert(1)' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('記事内でid(topic識別子)が重複しているとき、検証エラーになること', () => {
    const topics = [validTopic({ id: 'topic-1' }), validTopic({ id: 'topic-1' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('sourcePublishedAtが無い(任意項目)場合でも、検証を通ること', () => {
    const topics = [validTopic({ sourcePublishedAt: undefined })]
    const article = parseArticle(validArticle({ topics }), '2026-09-09.json')
    expect(article.topics[0].sourcePublishedAt).toBeUndefined()
  })
})

// 仕様: specs/news-digest/article-detail/design.md#バリデーション
describe('記事スキーマへの固定4観点(summary)検証の組み込み - 4キーの欠落・空文字を拒否する', () => {
  it('summaryにwhatHappened/whyItMatters/background/outlookのいずれかが欠けているとき、検証エラーになること', () => {
    const summary = validSummary()
    delete (summary as Record<string, unknown>).outlook
    const topics = [validTopic({ summary })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('いずれかの観点のheadingが空文字のとき、検証エラーになること', () => {
    const topics = [validTopic({ summary: validSummary({ whatHappened: { heading: '', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(250) } }) })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('いずれかの観点のteaserが空文字のとき、検証エラーになること', () => {
    const topics = [validTopic({ summary: validSummary({ whatHappened: { heading: '見出し', teaser: '', detail: 'あ'.repeat(250) } }) })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('いずれかの観点のdetailが空文字のとき、検証エラーになること', () => {
    const topics = [validTopic({ summary: validSummary({ whatHappened: { heading: '見出し', teaser: 'あ'.repeat(60), detail: '' } }) })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })
})

// 仕様: specs/news-digest/article-detail/design.md#バリデーション
describe('記事スキーマへの導入文(teaser)分量検証の組み込み - 40〜140字の範囲外を拒否する', () => {
  it('teaserが39字(下限未満)の観点を含む記事データは検証エラーになること', () => {
    const topics = [validTopic({ summary: validSummary({ whatHappened: { heading: '見出し', teaser: 'あ'.repeat(39), detail: 'あ'.repeat(250) } }) })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('teaserが141字(上限超過)の観点を含む記事データは検証エラーになること', () => {
    const topics = [validTopic({ summary: validSummary({ whatHappened: { heading: '見出し', teaser: 'あ'.repeat(141), detail: 'あ'.repeat(250) } }) })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('teaserが40字(下限)・140字(上限)ちょうどの観点は検証を通ること', () => {
    const topics = [
      validTopic({
        summary: validSummary({
          whatHappened: { heading: '見出し1', teaser: 'あ'.repeat(40), detail: 'あ'.repeat(250) },
          whyItMatters: { heading: '見出し2', teaser: 'い'.repeat(140), detail: 'い'.repeat(250) },
        }),
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).not.toThrow()
  })
})

// 仕様: specs/news-digest/article-detail/design.md#バリデーション
describe('記事スキーマへの詳細文(detail)合計分量検証の組み込み - 4観点合計800〜1700字の範囲外を拒否する', () => {
  it('4観点のdetail合計が799字(下限未満)のとき、検証エラーになること', () => {
    const topics = [
      validTopic({
        summary: {
          whatHappened: { heading: '見出し1', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(200) },
          whyItMatters: { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(200) },
          background: { heading: '見出し3', teaser: 'う'.repeat(60), detail: 'う'.repeat(200) },
          outlook: { heading: '見出し4', teaser: 'え'.repeat(60), detail: 'え'.repeat(199) },
        },
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('4観点のdetail合計が1701字(上限超過)のとき、検証エラーになること', () => {
    const topics = [
      validTopic({
        summary: {
          whatHappened: { heading: '見出し1', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
          whyItMatters: { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
          background: { heading: '見出し3', teaser: 'う'.repeat(60), detail: 'う'.repeat(500) },
          outlook: { heading: '見出し4', teaser: 'え'.repeat(60), detail: 'え'.repeat(201) },
        },
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('4観点のdetail合計が800〜1700字の範囲内のとき、検証を通ること', () => {
    const article = parseArticle(validArticle(), '2026-09-09.json')
    expect(article.topics).toHaveLength(1)
  })
})

// 仕様: specs/news-digest/article-detail/design.md#バリデーション
describe('記事スキーマへの重要度(importance)検証の組み込み - 1〜5の整数以外を拒否する', () => {
  it('importanceが範囲外(6)のとき、検証エラーになること', () => {
    const topics = [validTopic({ importance: 6 })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('importanceが範囲外(0)のとき、検証エラーになること', () => {
    const topics = [validTopic({ importance: 0 })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('importanceが整数でない(3.5)とき、検証エラーになること', () => {
    const topics = [validTopic({ importance: 3.5 })]
    expect(() => parseArticle(validArticle({ topics }), '2026-09-09.json')).toThrow()
  })

  it('importanceが1〜5の整数のとき、検証を通り値が保持されること', () => {
    const topics = [validTopic({ importance: 1 })]
    const article = parseArticle(validArticle({ topics }), '2026-09-09.json')
    expect(article.topics[0].importance).toBe(1)
  })
})
