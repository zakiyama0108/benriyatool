import { describe, it, expect } from 'vitest'
import {
  normalizeTitle,
  excludeAlreadyPublishedTopics,
  narrowGenreCandidates,
  selectEditionTopics,
} from '../../../app/trend-digest/lib/selection'
import type { Candidate } from '../../../app/trend-digest/lib/candidateTypes'
import type { GenreCandidateEntry } from '../../../app/trend-digest/lib/selection'
import type { Criteria } from '../../../app/trend-digest/lib/watchlistTypes'
import type { Genre } from '../../../app/trend-digest/lib/types'
import criteriaData from '../../../content/trend-digest/criteria.json'

const criteria = criteriaData as Criteria

function baseCandidate(overrides: Partial<Candidate>): Candidate {
  return {
    genre: 'music',
    title: 'テストタイトル',
    sourceName: 'Oricon週間チャート',
    sourceUrl: 'https://example.com/a',
    method: 'fixed-list',
    strength: 90,
    ...overrides,
  }
}

// 仕様: specs/trend-digest/content-selection/requirements.md#掲載済み話題の再掲抑制-1
describe('掲載済み話題の再掲抑制 - 過去に掲載済みのトピック(同一作品名・同一話題)は採用基準を満たしていても候補から除外する', () => {
  it('過去記事の掲載トピックと同名(完全一致)の候補は除外され、一致しない候補は残ること', () => {
    const published = new Set(['アイドルソング'])
    const already = baseCandidate({ title: 'アイドルソング' })
    const fresh = baseCandidate({ title: '新曲B' })
    const result = excludeAlreadyPublishedTopics([already, fresh], published)
    expect(result.map((c) => c.title)).toEqual(['新曲B'])
  })

  it('前後の空白・全角半角・英字の大文字小文字の違いを吸収して一致判定すること', () => {
    const published = new Set(['abc special edition'])
    const already = baseCandidate({ title: '  ＡＢＣ Special Edition  ' })
    const result = excludeAlreadyPublishedTopics([already], published)
    expect(result).toHaveLength(0)
  })

  it('過去記事の集合が空のとき、どの候補も除外されないこと', () => {
    const candidates = [baseCandidate({ title: 'a' }), baseCandidate({ title: 'b' })]
    const result = excludeAlreadyPublishedTopics(candidates, new Set())
    expect(result).toHaveLength(2)
  })

  it('タイトルの正規化は、前後の空白除去・全角/半角の統一・英字の大文字小文字統一を行うこと', () => {
    expect(normalizeTitle('  ＡＢＣ Special Edition  ')).toBe(normalizeTitle('abc special edition'))
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#機能要件-4、specs/trend-digest/content-selection/requirements.md#ジャンル内の絞り込み(1ジャンル最大2件)-1、specs/trend-digest/content-selection/requirements.md#ジャンル内の絞り込み(1ジャンル最大2件)-2
describe('ジャンル内の絞り込み - 1ジャンルにつき掲載するトピックは最大2件とし、候補が3件以上あるときはstrengthが高い順に上位2件へ絞る', () => {
  it('候補が3件以上あるとき、strength降順で上位2件に絞られること', () => {
    const candidates = [
      baseCandidate({ title: 'a', strength: 50 }),
      baseCandidate({ title: 'b', strength: 90 }),
      baseCandidate({ title: 'c', strength: 70 }),
    ]
    const result = narrowGenreCandidates(candidates, 2)
    expect(result.map((c) => c.title)).toEqual(['b', 'c'])
  })

  it('候補が0〜2件のとき、絞り込まずそのまま採用されること', () => {
    const candidates = [baseCandidate({ title: 'a', strength: 50 }), baseCandidate({ title: 'b', strength: 90 })]
    const result = narrowGenreCandidates(candidates, 2)
    expect(result.map((c) => c.title)).toEqual(['b', 'a'])
  })

  it('候補が1件もないとき、空配列を返すこと', () => {
    expect(narrowGenreCandidates([], 2)).toEqual([])
  })
})

// 仕様: specs/trend-digest/content-selection/requirements.md#機能要件-3、specs/trend-digest/content-selection/requirements.md#機能要件-5、specs/trend-digest/content-selection/requirements.md#配信全体の絞り込み(1回最大10件)-1
describe('編全体の絞り込み - 1回の配信につき掲載する合計トピック数は最大10件とし、各ジャンルの1件目を優先して残し、2件目は固定リスト→WebSearchの順で残り枠に追加する', () => {
  const entertainmentGenres: Genre[] = [
    'music', 'japanese-movie', 'foreign-movie', 'japanese-drama', 'foreign-drama',
    'anime', 'variety', 'streaming-video', 'books-comics',
  ]

  function twoCandidates(genre: Genre, method: 'fixed-list' | 'websearch'): Candidate[] {
    return [
      baseCandidate({ genre, title: `${genre}-1件目`, method, strength: 90 }),
      baseCandidate({ genre, title: `${genre}-2件目`, method, strength: 80 }),
    ]
  }

  it('各ジャンル9つすべてに2件ずつ候補があるとき、まず全ジャンルの1件目(9件)が残り、次に固定リストジャンルの2件目から先に残り1枠が埋まって合計10件になること', () => {
    const genreEntries: GenreCandidateEntry[] = entertainmentGenres.map((genre) => ({
      genre,
      method: genre === 'japanese-drama' || genre === 'variety' ? 'websearch' : 'fixed-list',
      candidates: twoCandidates(genre, genre === 'japanese-drama' || genre === 'variety' ? 'websearch' : 'fixed-list'),
    }))

    const result = selectEditionTopics(genreEntries, criteria, 'entertainment')
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics).toHaveLength(10)
    // 全ジャンルの1件目が含まれること
    for (const genre of entertainmentGenres) {
      expect(result.topics.some((t) => t.title === `${genre}-1件目`)).toBe(true)
    }
    // 2件目は固定リストジャンル(music)のものが1件だけ追加され、WebSearchジャンル(japanese-drama等)の2件目は追加されないこと
    expect(result.topics.some((t) => t.title === 'music-2件目')).toBe(true)
    expect(result.topics.some((t) => t.title === 'japanese-drama-2件目')).toBe(false)
    expect(result.topics.some((t) => t.title === 'variety-2件目')).toBe(false)
  })

  it('最終的な並び順が、そのeditionの9ジャンルの定義順(GENRE_ORDER)になること', () => {
    const genreEntries: GenreCandidateEntry[] = [...entertainmentGenres].reverse().map((genre) => ({
      genre,
      method: 'fixed-list' as const,
      candidates: [baseCandidate({ genre, title: `${genre}-1件目`, strength: 90 })],
    }))

    const result = selectEditionTopics(genreEntries, criteria, 'entertainment')
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics.map((t) => t.genre)).toEqual(entertainmentGenres)
  })

  it('対象9ジャンルすべてで候補が0件のとき、候補不足によりスキップ結果になること', () => {
    const genreEntries: GenreCandidateEntry[] = entertainmentGenres.map((genre) => ({
      genre,
      method: 'fixed-list' as const,
      candidates: [],
    }))

    const result = selectEditionTopics(genreEntries, criteria, 'entertainment')
    expect(result.status).toBe('skipped')
  })

  it('一部のジャンルだけ候補が0件でも、他のジャンルに候補があれば通常どおり選定されること', () => {
    const genreEntries: GenreCandidateEntry[] = entertainmentGenres.map((genre) => ({
      genre,
      method: 'fixed-list' as const,
      candidates: genre === 'music' ? [] : [baseCandidate({ genre, title: `${genre}-1件目`, strength: 90 })],
    }))

    const result = selectEditionTopics(genreEntries, criteria, 'entertainment')
    expect(result.status).toBe('ok')
    if (result.status !== 'ok') return
    expect(result.topics).toHaveLength(8)
    expect(result.topics.some((t) => t.genre === 'music')).toBe(false)
  })
})
