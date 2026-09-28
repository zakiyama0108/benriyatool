import { describe, it, expect } from 'vitest'
import { buildPrediction } from '../../../app/future-digest/lib/buildPrediction'
import type { Candidate } from '../../../app/future-digest/lib/candidateTypes'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'technology-ai',
    horizon: 'near',
    impact: 'high',
    impactRank: 1,
    impactReason: '多くの人に影響する',
    targetPeriod: '2030年まで',
    sourceTitle: '元記事タイトル',
    sourceName: '情報源名',
    sourceUrl: 'https://example.com/a',
    publishedAt: '2026-01-01',
    ...overrides,
  }
}

// 仕様: specs/future-digest/content-generation/requirements.md#記事の構成-6、specs/future-digest/content-generation/requirements.md#要約-1、specs/future-digest/content-generation/requirements.md#著作権への配慮-2
describe('予測データの組み立て - 選定時の値+生成結果から予測1本分のデータを組み立てる', () => {
  it('ジャンル・時間軸・影響度・根拠・対象時期・出典は選定時の値をそのまま引き継ぐこと(見出し・本文・影響度・根拠・出典で構成する。出典明記の要件)', () => {
    const candidate = makeCandidate()
    const prediction = buildPrediction(candidate, { heading: '見出し', body: 'あ'.repeat(200) })

    expect(prediction.genre).toBe(candidate.genre)
    expect(prediction.horizon).toBe(candidate.horizon)
    expect(prediction.impact).toBe(candidate.impact)
    expect(prediction.impactReason).toBe(candidate.impactReason)
    expect(prediction.targetPeriod).toBe(candidate.targetPeriod)
    expect(prediction.sourceTitle).toBe(candidate.sourceTitle)
    expect(prediction.sourceName).toBe(candidate.sourceName)
    expect(prediction.sourceUrl).toBe(candidate.sourceUrl)
  })

  it('見出し・本文は生成結果から入ること', () => {
    const prediction = buildPrediction(makeCandidate(), { heading: '生成された見出し', body: 'あ'.repeat(200) })
    expect(prediction.heading).toBe('生成された見出し')
    expect(prediction.body).toBe('あ'.repeat(200))
  })

  it('予測IDが<genre>--<horizon>になること', () => {
    const prediction = buildPrediction(makeCandidate({ genre: 'medical-health', horizon: 'long' }), {
      heading: '見出し',
      body: 'あ'.repeat(200),
    })
    expect(prediction.id).toBe('medical-health--long')
  })
})
