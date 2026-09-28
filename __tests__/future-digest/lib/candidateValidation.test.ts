import { describe, it, expect } from 'vitest'
import { validateCandidates } from '../../../app/future-digest/lib/candidateValidation'

function makeRawCandidate(overrides: Record<string, unknown> = {}) {
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

// 仕様: specs/future-digest/content-selection/requirements.md#影響度-1、specs/future-digest/content-selection/design.md「バリデーション」
describe('候補ごとの検証 - Claudeが返した候補ごとに検証し、満たさない候補はその場で捨てる', () => {
  it('全項目を満たす候補は採用されること', () => {
    const { candidates, rejected } = validateCandidates([makeRawCandidate()], ['near', 'long'])
    expect(candidates).toHaveLength(1)
    expect(rejected).toHaveLength(0)
  })

  it('今回の時間軸2区分以外のhorizonの候補は捨てられ理由が返ること', () => {
    const { candidates, rejected } = validateCandidates([makeRawCandidate({ horizon: 'mid' })], ['near', 'long'])
    expect(candidates).toHaveLength(0)
    expect(rejected).toHaveLength(1)
    expect(rejected[0].reason).toMatch(/horizon/i)
  })

  it('定義外の影響度(impact)の候補は捨てられること', () => {
    const { candidates } = validateCandidates([makeRawCandidate({ impact: 'very-high' })], ['near', 'long'])
    expect(candidates).toHaveLength(0)
  })

  it('impactRankが0以下の候補は捨てられること', () => {
    const { candidates } = validateCandidates([makeRawCandidate({ impactRank: 0 })], ['near', 'long'])
    expect(candidates).toHaveLength(0)
  })

  it('必須項目(impactReason等)が空の候補は捨てられること', () => {
    const { candidates } = validateCandidates([makeRawCandidate({ impactReason: '' })], ['near', 'long'])
    expect(candidates).toHaveLength(0)
  })

  it('sourceUrlがhttp(s)以外の候補は捨てられること', () => {
    const { candidates } = validateCandidates([makeRawCandidate({ sourceUrl: 'ftp://example.com/a' })], ['near', 'long'])
    expect(candidates).toHaveLength(0)
  })

  it('impactReasonが200字を超える候補は捨てられること', () => {
    const { candidates } = validateCandidates(
      [makeRawCandidate({ impactReason: 'あ'.repeat(201) })],
      ['near', 'long'],
    )
    expect(candidates).toHaveLength(0)
  })

  it('sourceTitleが300字を超える候補は捨てられること', () => {
    const { candidates } = validateCandidates(
      [makeRawCandidate({ sourceTitle: 'あ'.repeat(301) })],
      ['near', 'long'],
    )
    expect(candidates).toHaveLength(0)
  })

  it('制御文字を含む候補は捨てられること(外部の記事から来た文字列のため)', () => {
    const { candidates } = validateCandidates(
      [makeRawCandidate({ sourceTitle: 'サンプル\u0000記事' })],
      ['near', 'long'],
    )
    expect(candidates).toHaveLength(0)
  })
})
