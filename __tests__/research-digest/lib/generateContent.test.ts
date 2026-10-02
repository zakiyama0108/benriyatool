import { describe, it, expect, vi } from 'vitest'
import {
  classifyGenerationResult,
  generateFindings,
  QuotaExhaustedError,
  type ClaudeCliResponse,
  type GenerateCallFn,
} from '../../../app/research-digest/lib/generateContent'
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
    doi: null,
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

function okResponse(body = 'あ'.repeat(200), heading = '見出し'): ClaudeCliResponse {
  return { result: JSON.stringify({ heading, body }) }
}

const QUOTA_RESPONSE: ClaudeCliResponse = { is_error: true, api_error_status: 429, result: "You've hit your weekly limit" }

// 仕様: specs/research-digest/content-generation/requirements.md#要約-2、specs/research-digest/content-generation/requirements.md#要約-3、specs/research-digest/content-generation/design.md「エラーハンドリング」
describe('生成結果の判定 - Claudeが書いた見出し・本文を、成功・一時的な失敗・利用上限への到達に分ける', () => {
  it('見出しと分量の妥当な本文なら成功と判定されること', () => {
    const result = classifyGenerationResult(okResponse(), makeCandidate())
    expect(result.kind).toBe('ok')
  })

  it('JSONを取り出せない応答は一時的な失敗になること', () => {
    expect(classifyGenerationResult({ result: '聞き返しの文章です' }, makeCandidate()).kind).toBe('transient')
  })

  it('元の論文を読めず見出しがnullで返された場合は一時的な失敗になること', () => {
    const res = { result: JSON.stringify({ heading: null, body: null }) }
    expect(classifyGenerationResult(res, makeCandidate()).kind).toBe('transient')
  })

  it('本文の分量が範囲外(160字未満・480字超)なら一時的な失敗になること', () => {
    expect(classifyGenerationResult(okResponse('あ'.repeat(159)), makeCandidate()).kind).toBe('transient')
    expect(classifyGenerationResult(okResponse('あ'.repeat(481)), makeCandidate()).kind).toBe('transient')
  })

  it('見出しが100字を超える場合は一時的な失敗になること', () => {
    expect(classifyGenerationResult(okResponse('あ'.repeat(200), 'あ'.repeat(101)), makeCandidate()).kind).toBe('transient')
  })

  it('査読前の論文で本文に「査読」がなければ一時的な失敗、あれば成功になること', () => {
    const preprint = makeCandidate({ isPreprint: true })
    expect(classifyGenerationResult(okResponse('あ'.repeat(200)), preprint).kind).toBe('transient')
    expect(classifyGenerationResult(okResponse('査読前の論文である点に注意が必要です。' + 'あ'.repeat(200)), preprint).kind).toBe('ok')
  })

  it('査読済みの論文では「査読」の記載を確認しないこと', () => {
    expect(classifyGenerationResult(okResponse('あ'.repeat(200)), makeCandidate({ isPreprint: false })).kind).toBe('ok')
  })

  it('Claude CLIが異常終了(生成の拒否を含む)した場合は一時的な失敗になること', () => {
    expect(classifyGenerationResult({ is_error: true, result: 'エラー' }, makeCandidate()).kind).toBe('transient')
  })

  it('利用上限への到達を示す応答は、一時的な失敗ではなく利用上限への到達と判定されること', () => {
    expect(classifyGenerationResult(QUOTA_RESPONSE, makeCandidate()).kind).toBe('quota')
  })
})

// 仕様: specs/research-digest/weekly-publish/requirements.md#掲載件数の保証-4
describe('生成のやり直しと除外 - 1本の失敗で全体を止めず、失敗した研究だけを「生成に失敗したジャンル」として除く', () => {
  it('一時的な失敗は同じ候補でやり直され、2回目に成功すれば結果に含まれること', async () => {
    const call = vi.fn<GenerateCallFn>().mockResolvedValueOnce({ result: '聞き返し' }).mockResolvedValueOnce(okResponse())
    const result = await generateFindings([makeCandidate()], call)
    expect(result.succeeded).toHaveLength(1)
    expect(result.failed).toHaveLength(0)
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('2回失敗した研究は生成に失敗したジャンルとして返り、他の研究の生成は続くこと', async () => {
    const bad = makeCandidate({ genre: 'nutrition-food', sourceUrl: 'https://example.com/bad' })
    const good = makeCandidate()
    const call = vi.fn<GenerateCallFn>().mockImplementation((c) => Promise.resolve(c === bad ? { result: '聞き返し' } : okResponse()))
    const onExcluded = vi.fn()
    const result = await generateFindings([bad, good], call, { onExcluded })
    expect(result.succeeded.map((s) => s.candidate.genre)).toEqual(['medical-health'])
    expect(result.failed.map((f) => f.candidate.genre)).toEqual(['nutrition-food'])
    expect(onExcluded).toHaveBeenCalledTimes(1)
  })

  it('採用した全件が2回失敗しても例外を投げず、全件を生成に失敗したジャンルとして返すこと(公開をスキップしないため)', async () => {
    const candidates = [makeCandidate(), makeCandidate({ genre: 'nutrition-food' })]
    const call = vi.fn<GenerateCallFn>().mockResolvedValue({ result: '聞き返し' })
    const result = await generateFindings(candidates, call)
    expect(result.succeeded).toHaveLength(0)
    expect(result.failed).toHaveLength(2)
  })

  it('利用上限への到達だけはやり直さず、以降の候補も呼ばずに例外を投げること(再実行cronに委ねる)', async () => {
    const call = vi.fn<GenerateCallFn>().mockResolvedValue(QUOTA_RESPONSE)
    await expect(generateFindings([makeCandidate(), makeCandidate({ genre: 'nutrition-food' })], call)).rejects.toBeInstanceOf(
      QuotaExhaustedError,
    )
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('生成に成功した研究は、選定時の値を引き継いだ記事データになること', async () => {
    const candidate = makeCandidate()
    const result = await generateFindings([candidate], vi.fn<GenerateCallFn>().mockResolvedValue(okResponse()))
    expect(result.succeeded[0].finding).toMatchObject({ id: 'medical-health', genre: 'medical-health', impact: 'high', heading: '見出し' })
  })
})
