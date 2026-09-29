import { describe, it, expect } from 'vitest'
import { sortGenres, type GenreEntry } from '../../../app/research-digest/lib/sortGenres'
import type { Article, EmptyGenre, Finding } from '../../../app/research-digest/lib/types'
import { GENRE_ORDER } from '../../../app/research-digest/lib/types'

function makeFinding(overrides: Partial<Finding>): Finding {
  const genre = overrides.genre ?? GENRE_ORDER[0]
  return {
    id: genre,
    genre,
    heading: '見出し',
    body: 'あ'.repeat(200),
    impact: 'medium',
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

function makeEmpty(overrides: Partial<EmptyGenre>): EmptyGenre {
  return { genre: GENRE_ORDER[0], reason: 'no-candidate', ...overrides }
}

function makeArticle(findings: Finding[], emptyGenres: EmptyGenre[] = []): Article {
  return { id: '2026-10-05', date: '2026-10-05', findings, emptyGenres }
}

const genres = (entries: GenreEntry[]) => entries.map((e) => e.genre)

// 仕様: specs/research-digest/article-detail/requirements.md#並び順の切り替え-8
describe('並び順「影響度順」 - 影響度の大きい順にジャンルを並べる', () => {
  it('影響度が大→中→小の順に並ぶこと', () => {
    const article = makeArticle([
      makeFinding({ genre: GENRE_ORDER[0], impact: 'low' }),
      makeFinding({ genre: GENRE_ORDER[1], impact: 'high' }),
      makeFinding({ genre: GENRE_ORDER[2], impact: 'medium' }),
    ])
    expect(genres(sortGenres(article, 'impact'))).toEqual([GENRE_ORDER[1], GENRE_ORDER[2], GENRE_ORDER[0]])
  })

  // 仕様: specs/research-digest/article-detail/requirements.md#並び順の切り替え-8、specs/research-digest/article-detail/requirements.md#並び順の切り替え-9
  it('同じ影響度の中ではジャンル順に並ぶこと', () => {
    const article = makeArticle([
      makeFinding({ genre: GENRE_ORDER[2], impact: 'high' }),
      makeFinding({ genre: GENRE_ORDER[0], impact: 'high' }),
      makeFinding({ genre: GENRE_ORDER[1], impact: 'high' }),
    ])
    expect(genres(sortGenres(article, 'impact'))).toEqual([GENRE_ORDER[0], GENRE_ORDER[1], GENRE_ORDER[2]])
  })

  // 仕様: specs/research-digest/article-detail/requirements.md#記事本文の表示-6
  it('候補が見つからなかったジャンル・収集に失敗したジャンル・生成に失敗した記事は末尾に、その中はジャンル順に並ぶこと', () => {
    const article = makeArticle(
      [makeFinding({ genre: GENRE_ORDER[3], impact: 'low' })],
      [
        makeEmpty({ genre: GENRE_ORDER[2], reason: 'generation-failed' }),
        makeEmpty({ genre: GENRE_ORDER[0], reason: 'collection-failed', collectionFailureReason: 'timeout' }),
        makeEmpty({ genre: GENRE_ORDER[1], reason: 'no-candidate' }),
      ]
    )
    expect(genres(sortGenres(article, 'impact'))).toEqual([GENRE_ORDER[3], GENRE_ORDER[0], GENRE_ORDER[1], GENRE_ORDER[2]])
  })
})

// 仕様: specs/research-digest/article-detail/requirements.md#並び順の切り替え-9
describe('並び順「ジャンル順」 - ジャンルの定義順にジャンルを並べる', () => {
  it('ジャンルの定義順に並び、掲載できなかったジャンルも本来の位置に並ぶこと', () => {
    const article = makeArticle(
      [makeFinding({ genre: GENRE_ORDER[2], impact: 'high' }), makeFinding({ genre: GENRE_ORDER[0], impact: 'low' })],
      [makeEmpty({ genre: GENRE_ORDER[1] })]
    )
    expect(genres(sortGenres(article, 'genre'))).toEqual([GENRE_ORDER[0], GENRE_ORDER[1], GENRE_ORDER[2]])
  })
})

// 仕様: specs/research-digest/article-detail/requirements.md#記事本文の表示-2、specs/research-digest/article-detail/requirements.md#記事本文の表示-3、specs/research-digest/article-detail/requirements.md#記事本文の表示-4、specs/research-digest/article-detail/requirements.md#記事本文の表示-5
describe('ジャンルの並び替え - 全ジャンルを欠けなく含める', () => {
  it('影響度順・ジャンル順のどちらでも、研究+掲載できなかったジャンルの合計が全ジャンル数と一致すること', () => {
    const article = makeArticle(
      GENRE_ORDER.slice(0, 8).map((genre) => makeFinding({ genre })),
      GENRE_ORDER.slice(8).map((genre) => makeEmpty({ genre }))
    )
    expect(sortGenres(article, 'impact')).toHaveLength(GENRE_ORDER.length)
    expect(sortGenres(article, 'genre')).toHaveLength(GENRE_ORDER.length)
  })
})
