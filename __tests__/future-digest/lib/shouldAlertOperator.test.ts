import { describe, it, expect } from 'vitest'
import { shouldAlertOperator } from '../../../app/future-digest/lib/shouldAlertOperator'
import type { SlotResult, Candidate } from '../../../app/future-digest/lib/candidateTypes'

// テスト用の候補を組み立てる(shouldAlertOperatorの判定には値の中身は使わないため最小限のフィールド)
function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'technology-ai',
    horizon: 'near',
    impact: 'high',
    impactRank: 1,
    impactReason: '多くの人に影響する',
    targetPeriod: '2030年まで',
    sourceTitle: 'サンプル記事',
    sourceName: 'サンプル情報源',
    sourceUrl: 'https://example.com/a',
    publishedAt: null,
    ...overrides,
  }
}

function selectedSlot(overrides: Partial<{ genre: string; horizon: SlotResult['horizon'] }> = {}): SlotResult {
  return {
    genre: overrides.genre ?? 'technology-ai',
    horizon: overrides.horizon ?? 'near',
    status: 'selected',
    candidate: makeCandidate(),
    candidateCount: 1,
  }
}

function noCandidateSlot(genre = 'medical-health', horizon: SlotResult['horizon'] = 'near'): SlotResult {
  return { genre, horizon, status: 'no-candidate', candidateCount: 0 }
}

function collectionFailedSlot(genre = 'technology-ai', horizon: SlotResult['horizon'] = 'near'): SlotResult {
  return { genre, horizon, status: 'collection-failed', reason: 'timeout' }
}

// 仕様: specs/future-digest/weekly-publish/requirements.md#掲載件数の保証-3、specs/future-digest/content-selection/requirements.md#収集失敗-4
describe('全枠が収集失敗だった回だけ運営者への警告が必要と判定する', () => {
  it('全枠(有効なジャンル数×2時間軸)がcollection-failedならtrueを返すこと', () => {
    const slots: SlotResult[] = [
      collectionFailedSlot('technology-ai', 'near'),
      collectionFailedSlot('technology-ai', 'long'),
      collectionFailedSlot('medical-health', 'near'),
      collectionFailedSlot('medical-health', 'long'),
    ]
    expect(shouldAlertOperator(slots)).toBe(true)
  })

  it('採用した候補が1件以上あればfalseを返すこと(他の枠がすべてcollection-failedでも)', () => {
    const slots: SlotResult[] = [
      selectedSlot({ genre: 'technology-ai', horizon: 'near' }),
      collectionFailedSlot('technology-ai', 'long'),
      collectionFailedSlot('medical-health', 'near'),
      collectionFailedSlot('medical-health', 'long'),
    ]
    expect(shouldAlertOperator(slots)).toBe(false)
  })

  it('no-candidateの枠が1つでも混在すればfalseを返すこと(採用0件で全枠no-candidateの場合を含む)', () => {
    const allNoCandidate: SlotResult[] = [
      noCandidateSlot('technology-ai', 'near'),
      noCandidateSlot('technology-ai', 'long'),
      noCandidateSlot('medical-health', 'near'),
      noCandidateSlot('medical-health', 'long'),
    ]
    expect(shouldAlertOperator(allNoCandidate)).toBe(false)

    const mixed: SlotResult[] = [
      noCandidateSlot('technology-ai', 'near'),
      collectionFailedSlot('technology-ai', 'long'),
      collectionFailedSlot('medical-health', 'near'),
      collectionFailedSlot('medical-health', 'long'),
    ]
    expect(shouldAlertOperator(mixed)).toBe(false)
  })
})
