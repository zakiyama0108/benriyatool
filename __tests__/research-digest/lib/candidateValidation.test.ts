import { describe, it, expect } from 'vitest'
import { validateCandidates } from '../../../app/research-digest/lib/candidateValidation'

const TODAY = new Date('2026-10-05T00:00:00+09:00')

function makeRaw(overrides: Record<string, unknown> = {}) {
  return {
    genre: 'medical-health',
    impact: 'high',
    impactRank: 1,
    impactReason: '多くの人の生活に関わる',
    sourceTitle: 'サンプル論文',
    sourceName: 'サンプル学術誌',
    sourceUrl: 'https://example.com/a',
    doi: '10.1000/abc',
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

function accepted(overrides: Record<string, unknown> = {}) {
  return validateCandidates([makeRaw(overrides)], TODAY).candidates
}

// 仕様: specs/research-digest/content-selection/requirements.md#影響度-1、specs/research-digest/content-selection/requirements.md#採用基準-3、specs/research-digest/content-selection/design.md「バリデーション」
describe('候補ごとの検証 - Claudeが返した研究の候補を1件ずつ検証し、満たさないものはその場で捨てる', () => {
  it('全項目を満たす候補は採用され、捨てられた候補はないこと', () => {
    const { candidates, rejected } = validateCandidates([makeRaw()], TODAY)
    expect(candidates).toHaveLength(1)
    expect(rejected).toHaveLength(0)
  })

  it('doiと発表年がnullの候補(公式発表など)も受け付けること', () => {
    expect(accepted({ doi: null, publishedYear: null })).toHaveLength(1)
  })

  it('定義外の影響度の候補は捨てられ、理由が返ること', () => {
    const { candidates, rejected } = validateCandidates([makeRaw({ impact: 'very-high' })], TODAY)
    expect(candidates).toHaveLength(0)
    expect(rejected[0].reason).toMatch(/impact/)
  })

  it('影響度は大・中・小に対応するhigh・medium・lowを受け付けること(プロンプトで指定する値と検証側の値を揃えるため)', () => {
    for (const impact of ['high', 'medium', 'low']) {
      expect(accepted({ impact })).toHaveLength(1)
    }
  })

  it('順位が0以下の候補は捨てられること', () => {
    expect(accepted({ impactRank: 0 })).toHaveLength(0)
  })

  it('根拠・論文名・発表元のいずれかが空の候補は捨てられること', () => {
    expect(accepted({ impactReason: '' })).toHaveLength(0)
    expect(accepted({ sourceTitle: ' ' })).toHaveLength(0)
    expect(accepted({ sourceName: '' })).toHaveLength(0)
  })

  it('URLがhttp・https以外の候補は捨てられること', () => {
    expect(accepted({ sourceUrl: 'ftp://example.com/a' })).toHaveLength(0)
  })

  it('DOIが10.で始まらない候補は捨てられること', () => {
    expect(accepted({ doi: 'abc/123' })).toHaveLength(0)
  })

  it('https://doi.org/付きのDOIは、正規化されたうえで受け付けられること', () => {
    const [candidate] = accepted({ doi: 'https://doi.org/10.1000/ABC' })
    expect(candidate.doi).toBe('10.1000/abc')
  })

  it('発表年が実行日の年より後(未来)の候補は捨てられ、実行日の年ちょうどは受け付けること', () => {
    expect(accepted({ publishedYear: 2027 })).toHaveLength(0)
    expect(accepted({ publishedYear: 2026 })).toHaveLength(1)
  })

  it('発表年が1900年より前の候補は捨てられること', () => {
    expect(accepted({ publishedYear: 1899 })).toHaveLength(0)
  })

  it('査読前かどうか(isPreprint)が真偽値でない候補は捨てられること(査読前の明記を落とさないため)', () => {
    expect(accepted({ isPreprint: 'true' })).toHaveLength(0)
    expect(accepted({ isPreprint: undefined })).toHaveLength(0)
  })

  it('根拠が200字超・発表元が200字超・論文名が300字超の候補は捨てられること', () => {
    expect(accepted({ impactReason: 'あ'.repeat(201) })).toHaveLength(0)
    expect(accepted({ sourceName: 'あ'.repeat(201) })).toHaveLength(0)
    expect(accepted({ sourceTitle: 'あ'.repeat(301) })).toHaveLength(0)
  })

  it('文字数の上限ちょうどの候補は受け付けること', () => {
    expect(accepted({ impactReason: 'あ'.repeat(200), sourceName: 'あ'.repeat(200), sourceTitle: 'あ'.repeat(300) })).toHaveLength(1)
  })

  it('制御文字を含む候補は捨てられること(外部のページから来た文字列のため)', () => {
    expect(accepted({ sourceTitle: 'サンプル\u0000論文' })).toHaveLength(0)
  })
})
