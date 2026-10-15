import { describe, it, expect } from 'vitest'
import { parseArticle } from '../../../app/ai-dev-digest/lib/articleSchema'

function validSections(overrides: Record<string, unknown>[] = []) {
  if (overrides.length > 0) return overrides
  return [
    { heading: '何が発表されたか', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
    { heading: '開発者への影響', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
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
    sourcePublishedAt: '2026-07-31T10:00:00Z',
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

// 固定4観点(TopicSummary)の有効なfixture(仕様: content-generation/requirements.md#要約-9〜12)
function validSummary(overrides: Record<string, unknown> = {}) {
  const perspective = (prefix: string) => ({
    heading: `${prefix}見出し`,
    teaser: prefix.repeat(60),
    detail: prefix.repeat(250),
  })
  return {
    benefit: perspective('あ'),
    whatsNew: perspective('い'),
    how: perspective('う'),
    howToUse: perspective('え'),
    ...overrides,
  }
}

// CurrentTopic(summary+importance形式)の有効なfixture
function validCurrentTopic(overrides: Record<string, unknown> = {}) {
  return {
    id: 'topic-1',
    heading: 'Anthropicが新モデルを発表',
    summary: validSummary(),
    importance: 4,
    sourceType: 'official',
    sourceName: 'Anthropic',
    sourceUrl: 'https://www.anthropic.com/news/example',
    sourcePublishedAt: '2026-07-31T10:00:00Z',
    belowCriteria: false,
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

  it('sourcePublishedAtが空文字のとき、検証エラーになること', () => {
    const topics = [validTopic({ sourcePublishedAt: '' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('sourcePublishedAtがISO 8601形式としてパースできない文字列のとき、検証エラーになること', () => {
    const topics = [validTopic({ sourcePublishedAt: '2026年7月31日' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('sourcePublishedAtが正常なISO 8601形式のとき、検証を通ること', () => {
    const topics = [validTopic({ sourcePublishedAt: '2026-07-31T10:00:00Z' })]
    const article = parseArticle(validArticle({ topics }), '2026-08-01.json')
    expect(article.topics[0].sourcePublishedAt).toBe('2026-07-31T10:00:00Z')
  })

  it('sourcePublishedAtが無い(本フィールド導入前の既存記事データ)場合でも、検証を通ること', () => {
    const topics = [validTopic({ sourcePublishedAt: undefined })]
    const article = parseArticle(validArticle({ topics }), '2026-08-01.json')
    expect(article.topics[0].sourcePublishedAt).toBeUndefined()
  })

  it('記事内でid(topic識別子)が重複しているとき、検証エラーになること', () => {
    const topics = [validTopic({ id: 'topic-1' }), validTopic({ id: 'topic-1' })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/design.md#バリデーション、specs/ai-dev-digest/content-generation/requirements.md#要約-5
describe('記事スキーマへのセクション数検証の組み込み - sectionsが2件未満、またはheading/teaser/detailが空文字のトピックを拒否する', () => {
  it('sectionsが1件(2件未満)のとき、検証エラーになること', () => {
    const topics = [
      validTopic({ sections: [{ heading: '見出し', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(1000) }] }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('セクションのheadingが空文字のとき、検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
          { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('セクションのteaserが空文字のとき、検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '見出し1', teaser: '', detail: 'あ'.repeat(500) },
          { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('セクションのdetailが空文字のとき、検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '見出し1', teaser: 'あ'.repeat(60), detail: '' },
          { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(1000) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/design.md#バリデーション、specs/ai-dev-digest/content-generation/requirements.md#要約-3
describe('記事スキーマへの導入文(teaser)分量検証の組み込み - isValidTeaserLengthで40〜140字の範囲外を拒否する', () => {
  it('teaserが39字(下限未満)のセクションを含む記事データは検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '見出し1', teaser: 'あ'.repeat(39), detail: 'あ'.repeat(500) },
          { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('teaserが141字(上限超過)のセクションを含む記事データは検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '見出し1', teaser: 'あ'.repeat(141), detail: 'あ'.repeat(500) },
          { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/design.md#前提: 記事データの形式(この機能が定義する共有スキーマ)、specs/ai-dev-digest/article-detail/design.md#バリデーション
describe('記事スキーマへの新旧フォーマット出し分け - sections(LegacyTopic)またはsummary+importance(CurrentTopic)のどちらか一方を要求する', () => {
  it('sections・summaryのどちらも持たないtopicは検証エラーになること', () => {
    const topic = validCurrentTopic()
    delete (topic as Record<string, unknown>).summary
    expect(() => parseArticle(validArticle({ topics: [topic] }), '2026-08-01.json')).toThrow()
  })

  it('sections・summaryの両方を持つtopicは検証エラーになること', () => {
    const topic = { ...validCurrentTopic(), sections: validSections() }
    expect(() => parseArticle(validArticle({ topics: [topic] }), '2026-08-01.json')).toThrow()
  })

  it('summary形式(CurrentTopic)の正常なトピックは検証を通り、importanceが保持されること', () => {
    const article = parseArticle(validArticle({ topics: [validCurrentTopic()] }), '2026-08-01.json')
    expect(article.topics[0]).toMatchObject({ importance: 4 })
  })

  it('summary形式でimportanceが範囲外(6)のとき、検証エラーになること', () => {
    const topics = [validCurrentTopic({ importance: 6 })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('summary形式でimportanceが整数でない(3.5)とき、検証エラーになること', () => {
    const topics = [validCurrentTopic({ importance: 3.5 })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('summary形式でいずれかの観点のteaserが範囲外(39字)のとき、検証エラーになること', () => {
    const topics = [
      validCurrentTopic({ summary: validSummary({ benefit: { heading: '見出し', teaser: 'あ'.repeat(39), detail: 'あ'.repeat(250) } }) }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('summary形式で4観点のdetail合計が範囲外(799字)のとき、検証エラーになること', () => {
    const topics = [
      validCurrentTopic({
        summary: validSummary({ benefit: { heading: '見出し', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(49) } }),
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('新形式(summary)・旧形式(sections)のtopicが同じ記事内に混在しても検証エラーにならないこと', () => {
    const topics = [validTopic({ id: 'topic-1' }), validCurrentTopic({ id: 'topic-2' })]
    const article = parseArticle(validArticle({ topics }), '2026-08-01.json')
    expect(article.topics).toHaveLength(2)
  })
})

// 仕様: specs/ai-dev-digest/article-detail/design.md#バリデーション、specs/ai-dev-digest/content-generation/requirements.md#要約-4
describe('記事スキーマへの詳細文(detail)合計分量検証の組み込み - isValidDetailLengthでsections合計800〜1700字の範囲外を拒否する', () => {
  it('sectionsのdetail合計が799字(下限未満)のトピックを含む記事データは検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '見出し1', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(400) },
          { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(399) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('sectionsのdetail合計が1701字(上限超過)のトピックを含む記事データは検証エラーになること', () => {
    const topics = [
      validTopic({
        sections: [
          { heading: '見出し1', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(900) },
          { heading: '見出し2', teaser: 'い'.repeat(60), detail: 'い'.repeat(801) },
        ],
      }),
    ]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })
})

// 🧭開発領域観点(domain)を含む新形式のsummary fixture(2026-09追加)
function validSummaryWithDomain(overrides: Record<string, unknown> = {}) {
  const perspective = (prefix: string) => ({
    heading: `${prefix}見出し`,
    teaser: prefix.repeat(60),
    detail: prefix.repeat(250),
  })
  return {
    domain: { ...perspective('あ'), domains: ['backend'] },
    benefit: perspective('い'),
    how: perspective('う'),
    howToUse: perspective('え'),
    ...overrides,
  }
}

// 仕様: specs/ai-dev-digest/article-detail/design.md#前提: 記事データの形式(この機能が定義する共有スキーマ)、specs/ai-dev-digest/article-detail/design.md#バリデーション
describe('記事スキーマへのdomain/whatsNew出し分け - summaryがdomain(新形式)またはwhatsNew(旧形式)のどちらか一方の4キー構成を要求する', () => {
  it('domain/benefit/how/howToUseの4キー構成(新形式)の正常なトピックは検証を通ること', () => {
    const article = parseArticle(validArticle({ topics: [validCurrentTopic({ summary: validSummaryWithDomain() })] }), '2026-08-01.json')
    expect(article.topics[0]).toMatchObject({ summary: { domain: { domains: ['backend'] } } })
  })

  it('domain・whatsNewの両方を持つsummaryは検証エラーになること', () => {
    const summary = { ...validSummaryWithDomain(), whatsNew: validSummary().whatsNew }
    const topics = [validCurrentTopic({ summary })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('domain・whatsNewのどちらも持たないsummaryは検証エラーになること', () => {
    const summary = validSummaryWithDomain()
    delete (summary as Record<string, unknown>).domain
    const topics = [validCurrentTopic({ summary })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('domain.domainsが空配列のとき、検証エラーになること', () => {
    const summary = validSummaryWithDomain({
      domain: { heading: 'あ見出し', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(250), domains: [] },
    })
    const topics = [validCurrentTopic({ summary })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('domain.domainsに未定義の開発領域が含まれるとき、検証エラーになること', () => {
    const summary = validSummaryWithDomain({
      domain: { heading: 'あ見出し', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(250), domains: ['unknown-domain'] },
    })
    const topics = [validCurrentTopic({ summary })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('domain形式(新形式)・whatsNew形式(旧形式)のtopicが同じ記事内に混在しても検証エラーにならないこと', () => {
    const topics = [
      validCurrentTopic({ id: 'topic-1', summary: validSummary() }),
      validCurrentTopic({ id: 'topic-2', summary: validSummaryWithDomain() }),
    ]
    const article = parseArticle(validArticle({ topics }), '2026-08-01.json')
    expect(article.topics).toHaveLength(2)
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-14、specs/ai-dev-digest/article-detail/design.md#バリデーション
describe('記事スキーマへの図解(diagram)検証の組み込み - 省略/null/mermaid/imageのいずれかの形式のみ受理する', () => {
  it('diagramキー自体が省略されている(この機能追加前の既存記事データ相当)とき、検証を通ること', () => {
    const article = parseArticle(validArticle({ topics: [validCurrentTopic({ summary: validSummary() })] }), '2026-08-01.json')
    expect(article.topics[0]).toMatchObject({ summary: { benefit: { heading: 'あ見出し' } } })
  })

  it('diagramがnullのとき、検証を通ること', () => {
    const summary = validSummaryWithDomain({
      benefit: { heading: 'い見出し', teaser: 'い'.repeat(60), detail: 'い'.repeat(250), diagram: null },
    })
    const article = parseArticle(validArticle({ topics: [validCurrentTopic({ summary })] }), '2026-08-01.json')
    expect(article.topics[0]).toMatchObject({ summary: { benefit: { diagram: null } } })
  })

  it('diagramが{type:"mermaid", code: 非空文字}のとき、検証を通ること', () => {
    const summary = validSummaryWithDomain({
      how: { heading: 'う見出し', teaser: 'う'.repeat(60), detail: 'う'.repeat(250), diagram: { type: 'mermaid', code: 'flowchart LR\nA-->B' } },
    })
    const article = parseArticle(validArticle({ topics: [validCurrentTopic({ summary })] }), '2026-08-01.json')
    expect(article.topics[0]).toMatchObject({ summary: { how: { diagram: { type: 'mermaid', code: 'flowchart LR\nA-->B' } } } })
  })

  it('diagramが{type:"image", path}でpathがcontent/ai-dev-digest/articles/images/配下のとき、検証を通ること', () => {
    const summary = validSummaryWithDomain({
      how: {
        heading: 'う見出し',
        teaser: 'う'.repeat(60),
        detail: 'う'.repeat(250),
        diagram: { type: 'image', path: '/content/ai-dev-digest/articles/images/2026-08-01-topic-1-how.png' },
      },
    })
    const article = parseArticle(validArticle({ topics: [validCurrentTopic({ summary })] }), '2026-08-01.json')
    expect(article.topics[0]).toMatchObject({
      summary: { how: { diagram: { type: 'image', path: '/content/ai-dev-digest/articles/images/2026-08-01-topic-1-how.png' } } },
    })
  })

  it('diagramが{type:"image", path}でpathがcontent/ai-dev-digest/articles/images/配下を指さないとき、検証エラーになること', () => {
    const summary = validSummaryWithDomain({
      how: { heading: 'う見出し', teaser: 'う'.repeat(60), detail: 'う'.repeat(250), diagram: { type: 'image', path: '/etc/passwd' } },
    })
    const topics = [validCurrentTopic({ summary })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('diagramが{type:"mermaid", code: 空文字}のとき、検証エラーになること', () => {
    const summary = validSummaryWithDomain({
      how: { heading: 'う見出し', teaser: 'う'.repeat(60), detail: 'う'.repeat(250), diagram: { type: 'mermaid', code: '' } },
    })
    const topics = [validCurrentTopic({ summary })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })

  it('diagramのtypeが未定義の値のとき、検証エラーになること', () => {
    const summary = validSummaryWithDomain({
      how: { heading: 'う見出し', teaser: 'う'.repeat(60), detail: 'う'.repeat(250), diagram: { type: 'chart' } },
    })
    const topics = [validCurrentTopic({ summary })]
    expect(() => parseArticle(validArticle({ topics }), '2026-08-01.json')).toThrow()
  })
})
