import { describe, it, expect } from 'vitest'
import { normalizeUrl, normalizeDoi, buildDeliveredIndex } from '../../../app/research-digest/lib/deliveredIndex'
import type { Article, Finding } from '../../../app/research-digest/lib/types'

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'medical-health',
    genre: 'medical-health',
    heading: '見出しA',
    body: 'あ'.repeat(200),
    impact: 'high',
    impactReason: '根拠',
    sourceTitle: '論文タイトルA',
    sourceName: '学術誌A',
    sourceUrl: 'https://example.com/a',
    doi: null,
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

function makeArticle(findings: Finding[]): Article {
  return { id: '2026-10-05-body-life', edition: 'body-life', date: '2026-10-05', findings, emptyGenres: [] }
}

// 仕様: specs/research-digest/content-selection/requirements.md#配信済みの研究の除外-1
describe('配信済みの研究の判定 - URLの表記ゆれ(大文字小文字・末尾スラッシュ・#以降・計測用クエリ)を同じ研究として扱う', () => {
  it('スキーム・ホスト名の大文字小文字を無視して同一視すること', () => {
    expect(normalizeUrl('HTTPS://Example.COM/path')).toBe(normalizeUrl('https://example.com/path'))
  })

  it('末尾スラッシュの有無を同一視すること', () => {
    expect(normalizeUrl('https://example.com/path/')).toBe(normalizeUrl('https://example.com/path'))
  })

  it('URL内の#以降を無視すること', () => {
    expect(normalizeUrl('https://example.com/path#section')).toBe(normalizeUrl('https://example.com/path'))
  })

  it('utm_で始まる計測用クエリを無視すること', () => {
    expect(normalizeUrl('https://example.com/path?utm_source=x&utm_medium=y')).toBe(normalizeUrl('https://example.com/path'))
  })

  it('utm_以外のクエリは別の研究として区別すること', () => {
    expect(normalizeUrl('https://example.com/path?id=1')).not.toBe(normalizeUrl('https://example.com/path?id=2'))
  })
})

// 仕様: specs/research-digest/content-selection/requirements.md#配信済みの研究の除外-1
describe('配信済みの研究の判定 - DOIの表記ゆれ(大文字小文字・https://doi.org/・doi:)を同じ論文として扱う', () => {
  it('大文字小文字を無視して同一視すること', () => {
    expect(normalizeDoi('10.1000/ABC.123')).toBe(normalizeDoi('10.1000/abc.123'))
  })

  it('先頭のhttps://doi.org/を付けても付けなくても同一視すること', () => {
    expect(normalizeDoi('https://doi.org/10.1000/abc.123')).toBe(normalizeDoi('10.1000/abc.123'))
  })

  it('先頭のdoi:を付けても付けなくても同一視すること', () => {
    expect(normalizeDoi('doi:10.1000/abc.123')).toBe(normalizeDoi('10.1000/abc.123'))
  })
})

// 仕様: specs/research-digest/content-selection/requirements.md#配信済みの研究の除外-1
describe('配信済みの一覧の作成 - 過去の全研究から正規化URL・DOIの集合と、ジャンル・見出し・論文名の一覧を作る', () => {
  it('全研究の正規化URLの集合を返すこと', () => {
    const article = makeArticle([
      makeFinding({ sourceUrl: 'https://example.com/a/' }),
      makeFinding({ id: 'nutrition-food', genre: 'nutrition-food', sourceUrl: 'https://example.com/b' }),
    ])
    const index = buildDeliveredIndex([article])
    expect(index.urls.has(normalizeUrl('https://example.com/a'))).toBe(true)
    expect(index.urls.has(normalizeUrl('https://example.com/b'))).toBe(true)
    expect(index.urls.size).toBe(2)
  })

  it('DOIを持つ研究だけ、正規化したDOIの集合に入ること', () => {
    const article = makeArticle([
      makeFinding({ doi: 'https://doi.org/10.1000/ABC' }),
      makeFinding({ id: 'nutrition-food', genre: 'nutrition-food', sourceUrl: 'https://example.com/b', doi: null }),
    ])
    const index = buildDeliveredIndex([article])
    expect([...index.dois]).toEqual(['10.1000/abc'])
  })

  it('ジャンル・見出し・論文名を1行ずつにした一覧を返すこと(Claudeへの重複判定材料)', () => {
    const index = buildDeliveredIndex([makeArticle([makeFinding({ heading: '見出しX', sourceTitle: 'タイトルX' })])])
    expect(index.lines).toHaveLength(1)
    expect(index.lines[0]).toContain('medical-health')
    expect(index.lines[0]).toContain('見出しX')
    expect(index.lines[0]).toContain('タイトルX')
  })

  it('過去記事が0件でも空の集合・一覧を返すこと', () => {
    const index = buildDeliveredIndex([])
    expect(index.urls.size).toBe(0)
    expect(index.dois.size).toBe(0)
    expect(index.lines).toHaveLength(0)
  })
})
