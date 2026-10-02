import { describe, it, expect, vi } from 'vitest'
import {
  classifyGenerationResult,
  generatePredictions,
  QuotaExhaustedError,
  type ClaudeCliResponse,
} from '../../../app/future-digest/lib/generateContent'
import type { Candidate } from '../../../app/future-digest/lib/candidateTypes'

function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'technology-ai',
    horizon: 'near',
    impact: 'high',
    impactRank: 1,
    impactReason: '根拠',
    targetPeriod: '2030年まで',
    sourceTitle: '元記事タイトル',
    sourceName: '情報源名',
    sourceUrl: 'https://example.com/a',
    publishedAt: null,
    ...overrides,
  }
}

function makeBody(length = 250): string {
  return 'あ'.repeat(length)
}

function okResult(): ClaudeCliResponse {
  return { result: JSON.stringify({ heading: '見出し', body: makeBody() }) }
}

// 仕様: specs/future-digest/content-generation/design.md「見出し・本文を書く処理」手順8、specs/future-digest/content-generation/design.md「エラーハンドリング」
describe('Claude Code CLIの応答の分類 - 成功/一時的失敗/利用上限到達の3種に分類する', () => {
  it('見出し・本文(160〜480字)を含むJSON応答はokに分類すること', () => {
    const c = classifyGenerationResult(okResult())
    expect(c.kind).toBe('ok')
    if (c.kind === 'ok') {
      expect(c.content.heading).toBe('見出し')
      expect(c.content.body).toHaveLength(250)
    }
  })

  it('JSONを抽出できない応答はtransientに分類すること', () => {
    expect(classifyGenerationResult({ result: '取得できませんでした' }).kind).toBe('transient')
  })

  it('headingがnullの応答(取得困難時の失敗シグナル)はtransientに分類すること', () => {
    const res: ClaudeCliResponse = { result: JSON.stringify({ heading: null, body: null }) }
    expect(classifyGenerationResult(res).kind).toBe('transient')
  })

  it('本文の文字数が160字未満・480字超の応答はtransientに分類すること', () => {
    expect(classifyGenerationResult({ result: JSON.stringify({ heading: '見出し', body: makeBody(100) }) }).kind).toBe('transient')
    expect(classifyGenerationResult({ result: JSON.stringify({ heading: '見出し', body: makeBody(500) }) }).kind).toBe('transient')
  })

  it('見出しが100字を超える応答はtransientに分類すること', () => {
    const res: ClaudeCliResponse = { result: JSON.stringify({ heading: 'あ'.repeat(101), body: makeBody() }) }
    expect(classifyGenerationResult(res).kind).toBe('transient')
  })

  it('api_error_statusが429の応答はquotaに分類すること', () => {
    const res: ClaudeCliResponse = { is_error: true, api_error_status: 429, result: "You've hit your weekly limit" }
    expect(classifyGenerationResult(res).kind).toBe('quota')
  })

  it('is_errorがtrueでも利用上限到達を示さない応答はtransientに分類すること', () => {
    expect(classifyGenerationResult({ is_error: true, result: 'ネットワークエラー' }).kind).toBe('transient')
  })
})

// 仕様: specs/future-digest/weekly-publish/requirements.md#掲載件数の保証-4、specs/future-digest/weekly-publish/design.md「1回分の記事を生成する処理」手順4
describe('予測記事の生成 - 個々の候補の生成失敗を除外し残りで公開する。全件失敗でも例外を投げず生成失敗の枠として返す', () => {
  it('一時的失敗が初回に出てもやり直しで成功した候補は結果に含まれること', async () => {
    const candidate = makeCandidate()
    const call = vi
      .fn()
      .mockResolvedValueOnce({ result: '取得できませんでした' })
      .mockResolvedValueOnce(okResult())
    const result = await generatePredictions([candidate], call)
    expect(result.succeeded).toHaveLength(1)
    expect(result.failed).toHaveLength(0)
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('最大2回(初回+1回)失敗する候補は「生成に失敗した枠」として返り、成功した残りの候補は結果に含まれること', async () => {
    const failing = makeCandidate({ sourceTitle: '失敗候補' })
    const passing = makeCandidate({ sourceTitle: '成功候補' })
    const call = vi.fn().mockImplementation((c: Candidate) =>
      Promise.resolve(c.sourceTitle === '失敗候補' ? { result: 'だめ' } : okResult()),
    )
    const result = await generatePredictions([failing, passing], call)
    expect(result.succeeded.map((r) => r.candidate.sourceTitle)).toEqual(['成功候補'])
    expect(result.failed.map((r) => r.candidate.sourceTitle)).toEqual(['失敗候補'])
  })

  it('採用した候補全件が2回失敗しても例外を投げず、全件を「生成に失敗した枠」として返すこと(公開をスキップせず生成失敗の記載で公開する方針のため)', async () => {
    const call = vi.fn().mockResolvedValue({ result: 'だめ' })
    const result = await generatePredictions([makeCandidate(), makeCandidate({ sourceTitle: '2件目' })], call)
    expect(result.succeeded).toHaveLength(0)
    expect(result.failed).toHaveLength(2)
  })

  it('利用上限への到達を検知した場合はやり直さず以降の候補も呼ばずに例外(QuotaExhaustedError)を投げること(全件生成失敗とは区別される唯一の例外)', async () => {
    const first = makeCandidate({ sourceTitle: '1件目' })
    const second = makeCandidate({ sourceTitle: '2件目' })
    const call = vi.fn().mockResolvedValue({ is_error: true, api_error_status: 429, result: "You've hit your weekly limit" })
    await expect(generatePredictions([first, second], call)).rejects.toBeInstanceOf(QuotaExhaustedError)
    expect(call).toHaveBeenCalledTimes(1)
  })
})
