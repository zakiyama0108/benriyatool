import { describe, it, expect } from 'vitest'
import { buildFinding } from '../../../app/research-digest/lib/buildFinding'
import type { Candidate } from '../../../app/research-digest/lib/candidateTypes'
import type { FindingSections } from '../../../app/research-digest/lib/types'

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

function makeSections(overrides: Partial<FindingSections> = {}): FindingSections {
  const section = { heading: '結論文', text: '本文', diagram: null }
  return { finding: section, basis: section, relevance: section, caveat: section, ...overrides }
}

// 仕様: specs/research-digest/content-generation/requirements.md#記事の構成-7
describe('研究1本分の記事データの組み立て - 選定時の値と生成した見出し・固定4観点(sections)を1つにまとめる', () => {
  it('ジャンル・影響度・根拠・出典・DOI・発表年・査読前かどうかは、選定時の値がそのまま引き継がれること', () => {
    const candidate = makeCandidate()
    const finding = buildFinding(candidate, { heading: '見出し', sections: makeSections() })
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

  it('見出し・sectionsだけが生成結果から入ること', () => {
    const sections = makeSections({ finding: { heading: '何が分かったか', text: 'い'.repeat(200), diagram: null } })
    const finding = buildFinding(makeCandidate(), { heading: '生成された見出し', sections })
    expect(finding.heading).toBe('生成された見出し')
    expect(finding.sections).toEqual(sections)
  })

  it('研究IDがジャンルのidになること(1ジャンル1本のため)', () => {
    const finding = buildFinding(makeCandidate({ genre: 'sleep-exercise' }), { heading: '見出し', sections: makeSections() })
    expect(finding.id).toBe('sleep-exercise')
  })
})
