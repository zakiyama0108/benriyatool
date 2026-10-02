import { describe, it, expect } from 'vitest'
import { buildFinding } from '../../../app/research-digest/lib/buildFinding'
import type { Candidate } from '../../../app/research-digest/lib/candidateTypes'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'medical-health',
    impact: 'high',
    impactRank: 1,
    impactReason: '多くの人の生活に関わる',
    sourceTitle: '論文名',
    sourceName: '学術誌名',
    sourceUrl: 'https://example.com/a',
    doi: '10.1000/abc',
    publishedYear: 2025,
    isPreprint: true,
    ...overrides,
  }
}

// 仕様: specs/research-digest/content-generation/requirements.md#記事の構成-6
describe('研究1本分の記事データの組み立て - 選定時の値と生成した見出し・本文を1つにまとめる', () => {
  it('ジャンル・影響度・根拠・出典・DOI・発表年・査読前かどうかは、選定時の値がそのまま引き継がれること', () => {
    const candidate = makeCandidate()
    const finding = buildFinding(candidate, { heading: '見出し', body: 'あ'.repeat(200) })
    expect(finding).toMatchObject({
      genre: candidate.genre,
      impact: candidate.impact,
      impactReason: candidate.impactReason,
      sourceTitle: candidate.sourceTitle,
      sourceName: candidate.sourceName,
      sourceUrl: candidate.sourceUrl,
      doi: candidate.doi,
      publishedYear: candidate.publishedYear,
      isPreprint: true,
    })
  })

  it('見出し・本文だけが生成結果から入ること', () => {
    const finding = buildFinding(makeCandidate(), { heading: '生成された見出し', body: 'い'.repeat(200) })
    expect(finding.heading).toBe('生成された見出し')
    expect(finding.body).toBe('い'.repeat(200))
  })

  it('研究IDがジャンルのidになること(1ジャンル1本のため)', () => {
    const finding = buildFinding(makeCandidate({ genre: 'sleep-exercise' }), { heading: '見出し', body: 'あ'.repeat(200) })
    expect(finding.id).toBe('sleep-exercise')
  })
})
