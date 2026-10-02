import { describe, it, expect } from 'vitest'
import { shouldAlertOperator } from '../../../app/research-digest/lib/shouldAlertOperator'
import type { GenreResult, Candidate } from '../../../app/research-digest/lib/candidateTypes'

// テスト用の候補を組み立てる(判定には値の中身は使わないため最小限のフィールド)
function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'medical-health',
    impact: 'high',
    impactRank: 1,
    impactReason: '多くの人の生活に関わる',
    sourceTitle: 'サンプル論文',
    sourceName: 'サンプル学術誌',
    sourceUrl: 'https://example.com/a',
    doi: null,
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

function selected(genre: string): GenreResult {
  return { genre, status: 'selected', candidate: makeCandidate({ genre }), candidateCount: 1 }
}
function noCandidate(genre: string): GenreResult {
  return { genre, status: 'no-candidate', candidateCount: 0 }
}
function collectionFailed(genre: string): GenreResult {
  return { genre, status: 'collection-failed', reason: 'timeout' }
}

// 仕様: specs/research-digest/weekly-publish/requirements.md#掲載件数の保証-3、specs/research-digest/content-selection/requirements.md#収集失敗-4
describe('全ジャンルが収集失敗だった回だけ運営者への警告が必要と判定する', () => {
  it('全ジャンルが収集失敗なら警告が必要と判定されること', () => {
    const results = [collectionFailed('medical-health'), collectionFailed('nutrition-food'), collectionFailed('ai-it')]
    expect(shouldAlertOperator(results)).toBe(true)
  })

  it('採用した研究が1件でもあれば、他のジャンルがすべて収集失敗でも警告しないこと', () => {
    const results = [selected('medical-health'), collectionFailed('nutrition-food'), collectionFailed('ai-it')]
    expect(shouldAlertOperator(results)).toBe(false)
  })

  it('候補なしのジャンルが1つでも混在すれば警告しないこと(全ジャンルが候補なしで採用0件の回も含む)', () => {
    const allNoCandidate = [noCandidate('medical-health'), noCandidate('nutrition-food')]
    expect(shouldAlertOperator(allNoCandidate)).toBe(false)

    const mixed = [noCandidate('medical-health'), collectionFailed('nutrition-food'), collectionFailed('ai-it')]
    expect(shouldAlertOperator(mixed)).toBe(false)
  })
})
