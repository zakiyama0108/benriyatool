import { describe, it, expect } from 'vitest'
import { assembleArticle } from '../../../app/research-digest/lib/assembleArticle'
import { parseArticle } from '../../../app/research-digest/lib/articleSchema'
import type { Finding } from '../../../app/research-digest/lib/types'

// テスト用の研究を組み立てる
function makeFinding(genre: string, overrides: Partial<Finding> = {}): Finding {
  return {
    id: genre,
    genre,
    heading: '見出し',
    body: 'あ'.repeat(200),
    impact: 'high',
    impactReason: '多くの人に影響する',
    sourceTitle: 'サンプル論文',
    sourceName: 'サンプル学術誌',
    sourceUrl: 'https://example.com/a',
    doi: null,
    publishedYear: 2026,
    isPreprint: false,
    ...overrides,
  }
}

const ACTIVE_GENRES = ['medical-health', 'technology-ai']

// 仕様: specs/research-digest/weekly-publish/requirements.md#掲載件数の保証-1、specs/research-digest/weekly-publish/requirements.md#掲載件数の保証-2、specs/research-digest/weekly-publish/requirements.md#掲載件数の保証-4
describe('記事データの組み立て - 選定結果・生成結果から記事データ1回分を組み立てる', () => {
  it('idと発行日が入り、採用した研究がそのまま反映されること', () => {
    const findings = [makeFinding('medical-health'), makeFinding('technology-ai')]

    const article = assembleArticle('2026-10-05', ACTIVE_GENRES, findings, [], [], [])

    expect(article.id).toBe('2026-10-05')
    expect(article.date).toBe('2026-10-05')
    expect(article.findings).toEqual(findings)
    expect(article.emptyGenres).toEqual([])
  })

  it('候補なしのジャンルが「候補なし」の理由つきで掲載できなかったジャンルに入ること', () => {
    const noCandidate = [{ genre: 'medical-health' }]

    const article = assembleArticle('2026-10-05', ACTIVE_GENRES, [makeFinding('technology-ai')], noCandidate, [], [])

    expect(article.emptyGenres).toEqual([{ genre: 'medical-health', reason: 'no-candidate' }])
  })

  it('収集失敗のジャンルが「収集失敗」の理由と分類ラベルつきで入ること', () => {
    const collectionFailed = [{ genre: 'medical-health', collectionFailureReason: 'timeout' as const }]

    const article = assembleArticle('2026-10-05', ACTIVE_GENRES, [makeFinding('technology-ai')], [], collectionFailed, [])

    expect(article.emptyGenres).toEqual([
      { genre: 'medical-health', reason: 'collection-failed', collectionFailureReason: 'timeout' },
    ])
  })

  it('生成に失敗したジャンルが「生成失敗」の理由つきで入ること', () => {
    const article = assembleArticle('2026-10-05', ACTIVE_GENRES, [makeFinding('technology-ai')], [], [], ['medical-health'])

    expect(article.emptyGenres).toEqual([{ genre: 'medical-health', reason: 'generation-failed' }])
  })

  it('収集失敗のジャンルに分類ラベルがない場合は例外を投げること', () => {
    const collectionFailed = [{ genre: 'medical-health', collectionFailureReason: undefined }]

    expect(() =>
      assembleArticle('2026-10-05', ACTIVE_GENRES, [makeFinding('technology-ai')], [], collectionFailed, []),
    ).toThrow()
  })

  it('候補なしのジャンルに分類ラベルがある場合は例外を投げること', () => {
    const noCandidate = [{ genre: 'medical-health', collectionFailureReason: 'timeout' }]

    expect(() =>
      assembleArticle('2026-10-05', ACTIVE_GENRES, [makeFinding('technology-ai')], noCandidate, [], []),
    ).toThrow()
  })

  it('生成に失敗したジャンルに分類ラベルがある場合は例外を投げること', () => {
    // 生成失敗はジャンル名だけを受け取るため、ラベル付きのオブジェクトが紛れ込んだ入力を不正として弾く
    const failed = [{ genre: 'medical-health', collectionFailureReason: 'timeout' }] as unknown as string[]

    expect(() =>
      assembleArticle('2026-10-05', ACTIVE_GENRES, [makeFinding('technology-ai')], [], [], failed),
    ).toThrow()
  })

  it('研究と掲載できなかったジャンルを合わせると有効な全ジャンルと過不足なく一致すること(足りない入力は例外)', () => {
    // technology-aiがどこにも現れない
    expect(() => assembleArticle('2026-10-05', ACTIVE_GENRES, [makeFinding('medical-health')], [], [], [])).toThrow()
  })

  it('有効でないジャンルが混じっている入力は例外を投げること', () => {
    const findings = [makeFinding('medical-health'), makeFinding('technology-ai'), makeFinding('unknown-genre')]

    expect(() => assembleArticle('2026-10-05', ACTIVE_GENRES, findings, [], [], [])).toThrow()
  })

  it('同じジャンルが研究と掲載できなかったジャンルの両方に現れる入力は例外を投げること', () => {
    const findings = [makeFinding('medical-health'), makeFinding('technology-ai')]

    expect(() => assembleArticle('2026-10-05', ACTIVE_GENRES, findings, [{ genre: 'medical-health' }], [], [])).toThrow()
  })

  it('研究が0件で、全ジャンルが候補なし・収集失敗・生成失敗のいずれかでも組み立てられること', () => {
    const genres = ['medical-health', 'ai-it', 'space-physics']

    const article = assembleArticle(
      '2026-10-05',
      genres,
      [],
      [{ genre: 'medical-health' }],
      [{ genre: 'ai-it', collectionFailureReason: 'other' as const }],
      ['space-physics'],
    )

    expect(article.findings).toEqual([])
    expect(article.emptyGenres).toHaveLength(3)
  })

  it('組み立てた記事が記事データの検証(parseArticle)を通ること', () => {
    // 検証はgenres.jsonの実在ジャンルで行われるため、実際のジャンルidを使う
    const genres = ['medical-health', 'ai-it']
    const article = assembleArticle(
      '2026-10-05',
      genres,
      [makeFinding('medical-health')],
      [],
      [{ genre: 'ai-it', collectionFailureReason: 'invalid-format' as const }],
      [],
    )

    expect(() => parseArticle(article, '2026-10-05.json')).not.toThrow()
  })
})
