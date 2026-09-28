import { describe, it, expect } from 'vitest'
import { selectSlots } from '../../../app/future-digest/lib/selectSlots'
import { normalizeUrl } from '../../../app/future-digest/lib/deliveredIndex'
import type { Candidate } from '../../../app/future-digest/lib/candidateTypes'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'technology-ai',
    horizon: 'near',
    impact: 'medium',
    impactRank: 1,
    impactReason: '根拠',
    targetPeriod: '2030年まで',
    sourceTitle: 'サンプル記事',
    sourceName: 'サンプル情報源',
    sourceUrl: 'https://example.com/a',
    publishedAt: null,
    ...overrides,
  }
}

const GENRES = ['technology-ai', 'medical-health']
const HORIZONS: ['near', 'long'] = ['near', 'long']

// 仕様: specs/future-digest/content-selection/requirements.md#機能要件-3、specs/future-digest/content-selection/requirements.md#機能要件-4、specs/future-digest/content-selection/requirements.md#機能要件-5、specs/future-digest/content-selection/requirements.md#影響度-3、specs/future-digest/content-selection/requirements.md#候補が見つからない枠-1、specs/future-digest/content-selection/requirements.md#収集失敗-1、specs/future-digest/content-selection/requirements.md#収集失敗-5
describe('枠ごとの候補採用 - 枠ごとに影響度最大の候補を採用し、候補なし・収集失敗ジャンルを合流させる', () => {
  it('影響度の大きい候補が採用されること', () => {
    const candidates = [
      makeCandidate({ sourceUrl: 'https://example.com/low', impact: 'low', impactRank: 1 }),
      makeCandidate({ sourceUrl: 'https://example.com/high', impact: 'high', impactRank: 1 }),
    ]
    const results = selectSlots(candidates, ['technology-ai'], HORIZONS, new Set(), [])
    const nearSlot = results.find((r) => r.genre === 'technology-ai' && r.horizon === 'near')
    expect(nearSlot?.status).toBe('selected')
    if (nearSlot?.status === 'selected') {
      expect(nearSlot.candidate.sourceUrl).toBe('https://example.com/high')
    }
  })

  it('同じ影響度では順位(impactRank)の小さい候補が採用されること', () => {
    const candidates = [
      makeCandidate({ sourceUrl: 'https://example.com/rank2', impact: 'high', impactRank: 2 }),
      makeCandidate({ sourceUrl: 'https://example.com/rank1', impact: 'high', impactRank: 1 }),
    ]
    const results = selectSlots(candidates, ['technology-ai'], HORIZONS, new Set(), [])
    const nearSlot = results.find((r) => r.genre === 'technology-ai' && r.horizon === 'near')
    if (nearSlot?.status === 'selected') {
      expect(nearSlot.candidate.sourceUrl).toBe('https://example.com/rank1')
    } else {
      throw new Error('採用されるべき枠がselectedではありません')
    }
  })

  it('配信済みURLの候補は除かれること', () => {
    const candidates = [makeCandidate({ sourceUrl: 'https://example.com/delivered' })]
    const deliveredUrls = new Set([normalizeUrl('https://example.com/delivered')])
    const results = selectSlots(candidates, ['technology-ai'], HORIZONS, deliveredUrls, [])
    const nearSlot = results.find((r) => r.genre === 'technology-ai' && r.horizon === 'near')
    expect(nearSlot?.status).toBe('no-candidate')
  })

  it('同じ回の別の枠で既に採用したURLは除かれること(同じ記事が2枠に載らないようにする)', () => {
    const sharedUrl = 'https://example.com/shared'
    const candidates = [
      makeCandidate({ genre: 'technology-ai', horizon: 'near', sourceUrl: sharedUrl }),
      makeCandidate({ genre: 'medical-health', horizon: 'near', sourceUrl: sharedUrl }),
    ]
    const results = selectSlots(candidates, GENRES, HORIZONS, new Set(), [])
    const techSlot = results.find((r) => r.genre === 'technology-ai' && r.horizon === 'near')
    const medSlot = results.find((r) => r.genre === 'medical-health' && r.horizon === 'near')
    expect(techSlot?.status).toBe('selected')
    expect(medSlot?.status).toBe('no-candidate')
  })

  it('候補が1件も残らない枠はno-candidateになること', () => {
    const results = selectSlots([], ['technology-ai'], HORIZONS, new Set(), [])
    const nearSlot = results.find((r) => r.genre === 'technology-ai' && r.horizon === 'near')
    expect(nearSlot).toMatchObject({ status: 'no-candidate', candidateCount: 0 })
  })

  it('collectionFailedGenresに含まれるジャンルは候補の有無に関わらず両時間軸が分類ラベルつきのcollection-failedになること', () => {
    const candidates = [makeCandidate({ genre: 'technology-ai', horizon: 'near' })]
    const results = selectSlots(candidates, ['technology-ai'], HORIZONS, new Set(), [
      { genre: 'technology-ai', reason: 'timeout' },
    ])
    const nearSlot = results.find((r) => r.genre === 'technology-ai' && r.horizon === 'near')
    const longSlot = results.find((r) => r.genre === 'technology-ai' && r.horizon === 'long')
    expect(nearSlot).toMatchObject({ status: 'collection-failed', reason: 'timeout' })
    expect(longSlot).toMatchObject({ status: 'collection-failed', reason: 'timeout' })
  })

  it('有効な全ジャンル×2時間軸の枠が過不足なく結果に含まれ、ジャンル順・時間軸の近い順に並ぶこと', () => {
    const results = selectSlots([], GENRES, HORIZONS, new Set(), [])
    expect(results).toHaveLength(GENRES.length * HORIZONS.length)
    expect(results.map((r) => [r.genre, r.horizon])).toEqual([
      ['technology-ai', 'near'],
      ['technology-ai', 'long'],
      ['medical-health', 'near'],
      ['medical-health', 'long'],
    ])
  })

  it('各枠の候補件数(candidateCount)が返り、収集失敗の枠は候補件数を持たないこと', () => {
    const candidates = [
      makeCandidate({ genre: 'technology-ai', horizon: 'near', sourceUrl: 'https://example.com/a' }),
      makeCandidate({ genre: 'technology-ai', horizon: 'near', sourceUrl: 'https://example.com/b' }),
    ]
    const results = selectSlots(candidates, ['technology-ai'], HORIZONS, new Set(), [])
    const nearSlot = results.find((r) => r.genre === 'technology-ai' && r.horizon === 'near')
    expect(nearSlot).toMatchObject({ status: 'selected', candidateCount: 2 })
    const failedResults = selectSlots([], ['technology-ai'], HORIZONS, new Set(), [
      { genre: 'technology-ai', reason: 'other' },
    ])
    const failedSlot = failedResults.find((r) => r.genre === 'technology-ai' && r.horizon === 'near')
    expect(failedSlot).not.toHaveProperty('candidateCount')
  })
})
