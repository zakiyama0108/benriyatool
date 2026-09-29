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
    id: '2026-10-05',
    date: '2026-10-05',
    findings: [finding('medical-health')],
    emptyGenres: [{ genre: 'nutrition-food', reason: 'no-candidate' }],
    ...overrides,
  }
}

const parse = (raw: unknown) => parseArticle(raw, '2026-10-05.json')

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
          { genre: 'ai-it', reason: 'collection-failed', collectionFailureReason: 'invalid-format' },
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
