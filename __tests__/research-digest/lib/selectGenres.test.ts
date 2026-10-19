import { describe, it, expect } from 'vitest'
import { selectGenres } from '../../../app/research-digest/lib/selectGenres'
import { buildDeliveredIndex, normalizeDoi, normalizeUrl, type DeliveredIndex } from '../../../app/research-digest/lib/deliveredIndex'
import type { Candidate } from '../../../app/research-digest/lib/candidateTypes'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'medical-health',
    impact: 'medium',
    impactRank: 1,
    impactReason: '根拠',
    sourceTitle: 'サンプル論文',
    sourceName: 'サンプル学術誌',
    sourceUrl: 'https://example.com/a',
    doi: null,
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

const GENRES = ['medical-health', 'nutrition-food']
const NONE_DELIVERED: DeliveredIndex = buildDeliveredIndex([])

function delivered(urls: string[] = [], dois: string[] = []): DeliveredIndex {
  return { urls: new Set(urls.map(normalizeUrl)), dois: new Set(dois.map(normalizeDoi)), lines: [] }
}

// 仕様: specs/research-digest/content-selection/requirements.md#機能要件-2、specs/research-digest/content-selection/requirements.md#機能要件-3、specs/research-digest/content-selection/requirements.md#機能要件-4、specs/research-digest/content-selection/requirements.md#影響度-3、specs/research-digest/content-selection/requirements.md#候補が見つからないジャンル-1、specs/research-digest/content-selection/requirements.md#収集失敗-1、specs/research-digest/content-selection/requirements.md#収集失敗-5
describe('ジャンルごとの研究の採用 - 影響度が最大の1本を選び、候補なし・収集失敗のジャンルも結果に残す', () => {
  it('影響度の大きい候補が採用されること', () => {
    const candidates = [
      makeCandidate({ sourceUrl: 'https://example.com/low', impact: 'low' }),
      makeCandidate({ sourceUrl: 'https://example.com/high', impact: 'high' }),
    ]
    const [result] = selectGenres({ 'medical-health': candidates }, ['medical-health'], NONE_DELIVERED, [])
    expect(result.status).toBe('selected')
    if (result.status === 'selected') expect(result.candidate.sourceUrl).toBe('https://example.com/high')
  })

  it('同じ影響度では順位の小さい候補が採用されること', () => {
    const candidates = [
      makeCandidate({ sourceUrl: 'https://example.com/rank2', impact: 'high', impactRank: 2 }),
      makeCandidate({ sourceUrl: 'https://example.com/rank1', impact: 'high', impactRank: 1 }),
    ]
    const [result] = selectGenres({ 'medical-health': candidates }, ['medical-health'], NONE_DELIVERED, [])
    if (result.status !== 'selected') throw new Error('採用されるべきジャンルがselectedではありません')
    expect(result.candidate.sourceUrl).toBe('https://example.com/rank1')
  })

  it('配信済みのURLの候補は除かれること', () => {
    const candidates = [makeCandidate({ sourceUrl: 'https://example.com/delivered/' })]
    const [result] = selectGenres({ 'medical-health': candidates }, ['medical-health'], delivered(['https://example.com/delivered']), [])
    expect(result.status).toBe('no-candidate')
  })

  it('配信済みのDOIの候補は、URLが違っても除かれること(別の報道サイトを経由した同じ論文を避けるため)', () => {
    const candidates = [makeCandidate({ sourceUrl: 'https://other.example.org/x', doi: '10.1000/ABC' })]
    const [result] = selectGenres({ 'medical-health': candidates }, ['medical-health'], delivered([], ['https://doi.org/10.1000/abc']), [])
    expect(result.status).toBe('no-candidate')
  })

  it('同じ回の別のジャンルで採用済みのURLは除かれること(同じ研究が2つのジャンルに載らないようにする)', () => {
    const shared = 'https://example.com/shared'
    const results = selectGenres(
      {
        'medical-health': [makeCandidate({ genre: 'medical-health', sourceUrl: shared })],
        'nutrition-food': [makeCandidate({ genre: 'nutrition-food', sourceUrl: shared })],
      },
      GENRES,
      NONE_DELIVERED,
      [],
    )
    expect(results[0].status).toBe('selected')
    expect(results[1].status).toBe('no-candidate')
  })

  it('同じ回の別のジャンルで採用済みのDOIは除かれること', () => {
    const results = selectGenres(
      {
        'medical-health': [makeCandidate({ sourceUrl: 'https://example.com/a', doi: '10.1000/abc' })],
        'nutrition-food': [makeCandidate({ genre: 'nutrition-food', sourceUrl: 'https://example.com/b', doi: '10.1000/ABC' })],
      },
      GENRES,
      NONE_DELIVERED,
      [],
    )
    expect(results[1].status).toBe('no-candidate')
  })

  it('候補が1件も残らないジャンルは、基準外の研究で埋めず候補なしになること', () => {
    const [result] = selectGenres({}, ['medical-health'], NONE_DELIVERED, [])
    expect(result).toMatchObject({ status: 'no-candidate', candidateCount: 0 })
  })

  it('収集失敗のジャンルは、候補の有無に関わらず分類ラベルつきの収集失敗になること', () => {
    const candidates = [makeCandidate()]
    const [result] = selectGenres({ 'medical-health': candidates }, ['medical-health'], NONE_DELIVERED, [
      { genre: 'medical-health', reason: 'timeout' },
    ])
    expect(result).toEqual({ genre: 'medical-health', status: 'collection-failed', reason: 'timeout' })
  })

  it('有効な全ジャンル(採用・候補なし・収集失敗)がジャンル順に過不足なく結果に含まれること', () => {
    const genres = ['medical-health', 'nutrition-food', 'ai-it']
    const results = selectGenres(
      { 'medical-health': [makeCandidate()] },
      genres,
      NONE_DELIVERED,
      [{ genre: 'ai-it', reason: 'other' }],
    )
    expect(results.map((r) => [r.genre, r.status])).toEqual([
      ['medical-health', 'selected'],
      ['nutrition-food', 'no-candidate'],
      ['ai-it', 'collection-failed'],
    ])
  })

  it('各ジャンルの候補件数が返り、収集失敗のジャンルは候補件数を持たないこと(候補なしの集計から除くため)', () => {
    const candidates = [makeCandidate({ sourceUrl: 'https://example.com/a' }), makeCandidate({ sourceUrl: 'https://example.com/b' })]
    const [selected] = selectGenres({ 'medical-health': candidates }, ['medical-health'], NONE_DELIVERED, [])
    expect(selected).toMatchObject({ status: 'selected', candidateCount: 2 })
    const [failed] = selectGenres({}, ['medical-health'], NONE_DELIVERED, [{ genre: 'medical-health', reason: 'other' }])
    expect(failed).not.toHaveProperty('candidateCount')
  })
})
