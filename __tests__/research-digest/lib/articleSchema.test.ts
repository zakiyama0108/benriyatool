import { describe, it, expect } from 'vitest'
import { parseArticle } from '../../../app/research-digest/lib/articleSchema'

function finding(genre: string, overrides: Record<string, unknown> = {}) {
  return {
    id: genre,
    genre,
    heading: '見出し',
    body: 'あ'.repeat(200),
    impact: 'high',
    impactReason: '根拠',
    sourceTitle: '論文名',
    sourceName: '学術誌',
    sourceUrl: 'https://example.com/a',
    doi: null,
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

function article(overrides: Record<string, unknown> = {}) {
  return {
    id: '2026-10-05-body-life',
    edition: 'body-life',
    date: '2026-10-05',
    findings: [finding('medical-health')],
    emptyGenres: [{ genre: 'nutrition-food', reason: 'no-candidate' }],
    ...overrides,
  }
}

const parse = (raw: unknown) => parseArticle(raw, '2026-10-05-body-life.json')

// 仕様: specs/research-digest/article-detail/design.md「バリデーション」
describe('記事データの検証 - 過去記事の読み込み時に壊れた記事データを例外で検知する', () => {
  it('正常な記事を受け付けること', () => {
    expect(parse(article()).findings).toHaveLength(1)
  })

  it('研究が0件で、掲載できなかったジャンルだけの記事も受け付けること(採用0件でも公開する回)', () => {
    const result = parse(
      article({
        findings: [],
        emptyGenres: [
          { genre: 'medical-health', reason: 'no-candidate' },
          { genre: 'nutrition-food', reason: 'generation-failed' },
          { genre: 'sleep-exercise', reason: 'collection-failed', collectionFailureReason: 'invalid-format' },
        ],
      }),
    )
    expect(result.findings).toHaveLength(0)
  })

  it('同じジャンルが研究と掲載できなかったジャンルの両方に現れる場合は拒否すること', () => {
    expect(() => parse(article({ emptyGenres: [{ genre: 'medical-health', reason: 'no-candidate' }] }))).toThrow()
  })

  it('genres.jsonにないジャンルは拒否すること', () => {
    expect(() => parse(article({ findings: [finding('unknown-genre')] }))).toThrow()
  })

  it('idがジャンルと一致しない研究は拒否すること', () => {
    expect(() => parse(article({ findings: [finding('medical-health', { id: 'other' })] }))).toThrow()
  })

  it('必須の文字列が空の研究は拒否すること', () => {
    expect(() => parse(article({ findings: [finding('medical-health', { impactReason: '' })] }))).toThrow()
  })

  it('出典URLがhttp・https以外なら拒否すること', () => {
    expect(() => parse(article({ findings: [finding('medical-health', { sourceUrl: 'ftp://example.com' })] }))).toThrow()
  })

  it('DOIが10.で始まらない文字列なら拒否し、nullは受け付けること', () => {
    expect(() => parse(article({ findings: [finding('medical-health', { doi: 'abc' })] }))).toThrow()
    expect(parse(article({ findings: [finding('medical-health', { doi: '10.1000/x' })] })).findings[0].doi).toBe('10.1000/x')
  })

  it('発表年が発行日の年より後なら拒否すること', () => {
    expect(() => parse(article({ findings: [finding('medical-health', { publishedYear: 2027 })] }))).toThrow()
  })

  it('査読前かどうかが真偽値でなければ拒否すること', () => {
    expect(() => parse(article({ findings: [finding('medical-health', { isPreprint: 'yes' })] }))).toThrow()
  })

  it('本文が160字未満・480字超なら拒否すること', () => {
    expect(() => parse(article({ findings: [finding('medical-health', { body: 'あ'.repeat(159) })] }))).toThrow()
    expect(() => parse(article({ findings: [finding('medical-health', { body: 'あ'.repeat(481) })] }))).toThrow()
  })

  it('掲載できなかった理由が定義外なら拒否すること', () => {
    expect(() => parse(article({ emptyGenres: [{ genre: 'nutrition-food', reason: 'unknown' }] }))).toThrow()
  })

  it('収集失敗で分類ラベルが欠けている・定義外の場合は拒否すること', () => {
    expect(() => parse(article({ emptyGenres: [{ genre: 'nutrition-food', reason: 'collection-failed' }] }))).toThrow()
    expect(() =>
      parse(article({ emptyGenres: [{ genre: 'nutrition-food', reason: 'collection-failed', collectionFailureReason: 'x' }] })),
    ).toThrow()
  })

  it('候補なし・生成失敗なのに分類ラベルを持つ場合は拒否すること', () => {
    for (const reason of ['no-candidate', 'generation-failed']) {
      expect(() =>
        parse(article({ emptyGenres: [{ genre: 'nutrition-food', reason, collectionFailureReason: 'timeout' }] })),
      ).toThrow()
    }
  })
})

// 仕様: specs/research-digest/article-detail/design.md「前提: 記事データの形式」「バリデーション」
describe('記事データの検証(edition) - idの形式・editionの値・ジャンルが対象編に属するかを検証する', () => {
  it('idが<date>-<edition>形式でidが不正なら拒否すること', () => {
    expect(() => parseArticle(article({ id: '2026-10-05' }), '2026-10-05.json')).toThrow()
    expect(() => parseArticle(article({ id: '2026-10-05-science-society' }), '2026-10-05-science-society.json')).toThrow()
  })

  it('editionが2値以外・未指定なら拒否すること', () => {
    expect(() => parse(article({ edition: 'other' }))).toThrow()
    expect(() => parse(article({ edition: undefined }))).toThrow()
  })

  it('研究のジャンルが記事のedition(対象編)に属していない場合は拒否すること(科学・社会編のジャンルをからだ・くらし編の記事に含める)', () => {
    expect(() => parse(article({ findings: [finding('ai-it')] }))).toThrow()
  })

  it('掲載できなかったジャンルが記事のedition(対象編)に属していない場合は拒否すること', () => {
    expect(() => parse(article({ emptyGenres: [{ genre: 'space-physics', reason: 'no-candidate' }] }))).toThrow()
  })

  it('科学・社会編のジャンルで構成された記事は受け付けること', () => {
    const result = parseArticle(
      article({
        id: '2026-10-05-science-society',
        edition: 'science-society',
        findings: [finding('ai-it')],
        emptyGenres: [{ genre: 'space-physics', reason: 'no-candidate' }],
      }),
      '2026-10-05-science-society.json',
    )
    expect(result.edition).toBe('science-society')
  })
})

// 固定4観点のsections形式のfixture(4観点のtextを連結して200字になるよう調整する)
function validSections(overrides: Record<string, Record<string, unknown>> = {}) {
  const base = {
    finding: { heading: '何が分かったか見出し', text: 'あ'.repeat(197), diagram: null },
    basis: { heading: 'なぜそう結論づけられたのか見出し', text: 'い', diagram: null },
    relevance: { heading: '暮らしへの関わり見出し', text: 'う', diagram: null },
    caveat: { heading: '注意点見出し', text: 'え', diagram: null },
  }
  return {
    finding: { ...base.finding, ...overrides.finding },
    basis: { ...base.basis, ...overrides.basis },
    relevance: { ...base.relevance, ...overrides.relevance },
    caveat: { ...base.caveat, ...overrides.caveat },
  }
}

function sectionsFinding(genre: string, overrides: Record<string, unknown> = {}) {
  const f = finding(genre, overrides)
  delete (f as Record<string, unknown>).body
  return { ...f, sections: overrides.sections ?? validSections() }
}

// 仕様: specs/research-digest/article-detail/design.md「バリデーション」(新形式(sectionsを持つ)の場合)、specs/research-digest/content-generation/requirements.md#要約-3
describe('固定4観点・図解への移行に伴う新旧データ形式の検証 - bodyを持つ旧形式・sectionsを持つ新形式のどちらか一方のみを受け付ける', () => {
  it('sections形式(新形式)の研究を受け付け、sectionsが保持されること', () => {
    const result = parse(article({ findings: [sectionsFinding('medical-health')] }))
    expect(result.findings[0]).toMatchObject({ sections: validSections() })
  })

  it('bodyとsectionsの両方を持つ研究は拒否すること', () => {
    expect(() => parse(article({ findings: [{ ...sectionsFinding('medical-health'), body: 'あ'.repeat(200) }] }))).toThrow()
  })

  it('bodyもsectionsも持たない研究は拒否すること', () => {
    const f = sectionsFinding('medical-health') as Record<string, unknown>
    delete f.sections
    expect(() => parse(article({ findings: [f] }))).toThrow()
  })

  it('sections形式でいずれかの観点(finding/basis/relevance/caveat)が欠けている場合は拒否すること', () => {
    const sections = validSections() as Record<string, unknown>
    delete sections.caveat
    expect(() => parse(article({ findings: [sectionsFinding('medical-health', { sections })] }))).toThrow()
  })

  it('sections形式でいずれかの観点のheading・textが空文字の場合は拒否すること', () => {
    expect(() =>
      parse(article({ findings: [sectionsFinding('medical-health', { sections: validSections({ basis: { heading: '' } }) })] })),
    ).toThrow()
  })

  it('sections形式で4観点のtext合計が160字未満・480字超の場合は拒否すること', () => {
    const tooShort = validSections({ finding: { text: 'あ'.repeat(1) } })
    expect(() => parse(article({ findings: [sectionsFinding('medical-health', { sections: tooShort })] }))).toThrow()
    const tooLong = validSections({ finding: { text: 'あ'.repeat(600) } })
    expect(() => parse(article({ findings: [sectionsFinding('medical-health', { sections: tooLong })] }))).toThrow()
  })

  it('新形式(sections)・旧形式(body)の研究が同じ記事内に混在しても検証エラーにならないこと', () => {
    const result = parse(article({ findings: [finding('medical-health'), sectionsFinding('nutrition-food')], emptyGenres: [] }))
    expect(result.findings).toHaveLength(2)
  })
})

// 仕様: specs/research-digest/content-generation/requirements.md#図解-6、specs/research-digest/article-detail/design.md#バリデーション
describe('記事スキーマへの図解(diagram)検証の組み込み - sectionsの各観点のdiagramがnull・mermaid・imageいずれかの正しい形のみ許可する', () => {
  it('diagramがnullのとき、検証を通ること(図解が不要な観点)', () => {
    const result = parse(article({ findings: [sectionsFinding('medical-health')] }))
    expect(result.findings[0]).toMatchObject({ sections: { finding: { diagram: null } } })
  })

  it('diagramが{type: "mermaid", code: 非空文字}のとき、検証を通りcodeが保持されること', () => {
    const sections = validSections({ finding: { diagram: { type: 'mermaid', code: 'flowchart LR\nA-->B' } } })
    const result = parse(article({ findings: [sectionsFinding('medical-health', { sections })] }))
    expect(result.findings[0]).toMatchObject({ sections: { finding: { diagram: { type: 'mermaid', code: 'flowchart LR\nA-->B' } } } })
  })

  it('diagramが{type: "mermaid", code: 空文字}のとき、検証エラーになること', () => {
    const sections = validSections({ finding: { diagram: { type: 'mermaid', code: '' } } })
    expect(() => parse(article({ findings: [sectionsFinding('medical-health', { sections })] }))).toThrow()
  })

  it('diagramが{type: "image", path: "content/research-digest/articles/images/"配下}のとき、検証を通ること', () => {
    const sections = validSections({
      finding: { diagram: { type: 'image', path: 'content/research-digest/articles/images/2026-10-05-medical-health-finding.png' } },
    })
    const result = parse(article({ findings: [sectionsFinding('medical-health', { sections })] }))
    expect(result.findings[0]).toMatchObject({
      sections: { finding: { diagram: { type: 'image', path: 'content/research-digest/articles/images/2026-10-05-medical-health-finding.png' } } },
    })
  })

  it('diagramが{type: "image", path: "content/research-digest/articles/images/"配下以外}のとき、検証エラーになること', () => {
    const sections = validSections({ finding: { diagram: { type: 'image', path: 'public/other.png' } } })
    expect(() => parse(article({ findings: [sectionsFinding('medical-health', { sections })] }))).toThrow()
  })

  it('diagramのtypeが未定義の値("chart"等)のとき、検証エラーになること', () => {
    const sections = validSections({ finding: { diagram: { type: 'chart', code: 'x' } } })
    expect(() => parse(article({ findings: [sectionsFinding('medical-health', { sections })] }))).toThrow()
  })
})
