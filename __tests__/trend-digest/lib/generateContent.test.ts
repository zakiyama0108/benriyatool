import { describe, it, expect, vi } from 'vitest'
import {
  classifyGenerationResult,
  generateTopics,
  QuotaExhaustedError,
  AllTopicsFailedError,
  type ClaudeCliResponse,
} from '../../../app/trend-digest/lib/generateContent'
import type { Candidate } from '../../../app/trend-digest/lib/candidateTypes'

// テスト用のCandidateを組み立てる(生成失敗時の分類・リトライ・除外の検証に必要な最小限のフィールド)
function makeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'music',
    title: '対象作品A',
    sourceName: 'Oricon',
    sourceUrl: 'https://example.com/a',
    method: 'fixed-list',
    strength: 90,
    ...overrides,
  }
}

// 160〜480字の範囲を満たすダミー本文を作る
function makeBody(length = 250): string {
  return 'あ'.repeat(length)
}

// 成功応答のresult文字列(JSONオブジェクト単体。見出し+本文の形式)を作る
function okResult(): ClaudeCliResponse {
  return {
    result: JSON.stringify({ heading: '見出し', body: makeBody() }),
  }
}

// 仕様: specs/trend-digest/content-generation/design.md「見出し・本文を書く処理」手順6、specs/trend-digest/content-generation/design.md「エラーハンドリング」
describe('classifyGenerationResult - Claude Code CLIの応答を成功/一時的失敗/利用枠枯渇の3種に分類する', () => {
  it('見出し・本文(160〜480字)を含むJSON応答はokに分類する', () => {
    const c = classifyGenerationResult(okResult())
    expect(c.kind).toBe('ok')
    if (c.kind === 'ok') {
      expect(c.content.heading).toBe('見出し')
      expect(c.content.body).toHaveLength(250)
    }
  })

  it('JSONを抽出できない応答(聞き返し等)はtransientに分類する', () => {
    const res: ClaudeCliResponse = { result: 'この記事は取得できませんでした。どう進めますか?案1/案2/案3' }
    expect(classifyGenerationResult(res).kind).toBe('transient')
  })

  it('headingがnullの応答(取得困難時の失敗シグナル)はtransientに分類する', () => {
    const res: ClaudeCliResponse = { result: JSON.stringify({ heading: null, body: null }) }
    expect(classifyGenerationResult(res).kind).toBe('transient')
  })

  it('bodyの文字数が160字未満(分量不正)の応答はtransientに分類する', () => {
    const res: ClaudeCliResponse = { result: JSON.stringify({ heading: '見出し', body: makeBody(100) }) }
    expect(classifyGenerationResult(res).kind).toBe('transient')
  })

  it('bodyの文字数が480字を超える(分量不正)の応答はtransientに分類する', () => {
    const res: ClaudeCliResponse = { result: JSON.stringify({ heading: '見出し', body: makeBody(500) }) }
    expect(classifyGenerationResult(res).kind).toBe('transient')
  })

  it('headingが空文字の応答はtransientに分類する', () => {
    const res: ClaudeCliResponse = { result: JSON.stringify({ heading: '', body: makeBody() }) }
    expect(classifyGenerationResult(res).kind).toBe('transient')
  })

  it('api_error_statusが429の応答はquotaに分類する', () => {
    const res: ClaudeCliResponse = {
      is_error: true,
      api_error_status: 429,
      result: "You've hit your weekly limit · resets 11pm (UTC)",
    }
    expect(classifyGenerationResult(res).kind).toBe('quota')
  })

  it('resultが利用上限到達メッセージを示す場合はquotaに分類する(api_error_statusが無くても)', () => {
    const res: ClaudeCliResponse = { is_error: true, result: "You've hit your weekly limit" }
    expect(classifyGenerationResult(res).kind).toBe('quota')
  })

  it('is_errorがtrueでも利用上限到達を示さない応答はtransientに分類する', () => {
    const res: ClaudeCliResponse = { is_error: true, result: 'ネットワークエラーが発生しました' }
    expect(classifyGenerationResult(res).kind).toBe('transient')
  })
})

// 仕様: specs/trend-digest/weekly-publish/design.md「1回分の記事を生成する処理」手順4、specs/trend-digest/weekly-publish/design.md「エラーハンドリング」
describe('generateTopics - 個々の候補の生成失敗を除外し残りで公開する / 全候補失敗・枯渇は例外', () => {
  it('一時的失敗が初回に出てもリトライで成功した候補は結果に含まれる', async () => {
    const candidate = makeCandidate()
    const call = vi
      .fn<(candidate: Candidate) => Promise<ClaudeCliResponse>>()
      .mockResolvedValueOnce({ result: '取得できませんでした' }) // 1回目: transient
      .mockResolvedValueOnce(okResult()) // 2回目: ok
    const result = await generateTopics([candidate], call)
    expect(result).toHaveLength(1)
    expect(result[0].candidate.title).toBe('対象作品A')
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('最大2回(初回+1回)失敗する候補は除外され、成功した残りの候補で結果を返す', async () => {
    const failing = makeCandidate({ title: '失敗候補' })
    const passing = makeCandidate({ title: '成功候補' })
    const call = vi
      .fn<(candidate: Candidate) => Promise<ClaudeCliResponse>>()
      .mockImplementation((c: Candidate) =>
        Promise.resolve(c.title === '失敗候補' ? { result: 'だめ' } : okResult()),
      )
    const onExcluded = vi.fn()
    const result = await generateTopics([failing, passing], call, { onExcluded })
    expect(result.map((r) => r.candidate.title)).toEqual(['成功候補'])
    // 失敗候補は初回+リトライ1回=2回呼ばれる
    expect(call).toHaveBeenCalledWith(failing)
    expect(onExcluded).toHaveBeenCalledTimes(1)
    expect(onExcluded).toHaveBeenCalledWith(expect.objectContaining({ candidate: failing }))
  })

  it('1件でも成功すれば結果配列が返る', async () => {
    const candidate = makeCandidate()
    const call = vi.fn<(candidate: Candidate) => Promise<ClaudeCliResponse>>().mockResolvedValue(okResult())
    const result = await generateTopics([candidate], call)
    expect(result).toHaveLength(1)
  })

  it('選定された全候補が失敗した場合はAllTopicsFailedErrorを投げる', async () => {
    const call = vi.fn<(candidate: Candidate) => Promise<ClaudeCliResponse>>().mockResolvedValue({ result: 'だめ' })
    await expect(generateTopics([makeCandidate()], call)).rejects.toBeInstanceOf(AllTopicsFailedError)
  })

  it('利用枠枯渇を検知したらリトライせず即座にQuotaExhaustedErrorを投げ、以降の候補を呼ばない', async () => {
    const first = makeCandidate({ title: '1件目' })
    const second = makeCandidate({ title: '2件目' })
    const call = vi.fn<(candidate: Candidate) => Promise<ClaudeCliResponse>>().mockResolvedValue({
      is_error: true,
      api_error_status: 429,
      result: "You've hit your weekly limit",
    })
    await expect(generateTopics([first, second], call)).rejects.toBeInstanceOf(QuotaExhaustedError)
    // 枯渇は即打ち切り: 1回目の候補で1回呼んだだけ(リトライも次候補もしない)
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('全候補失敗と利用枠枯渇の例外は互いに区別できる(型が異なる)', async () => {
    const transientCall = vi.fn<(candidate: Candidate) => Promise<ClaudeCliResponse>>().mockResolvedValue({ result: 'だめ' })
    const quotaCall = vi
      .fn<(candidate: Candidate) => Promise<ClaudeCliResponse>>()
      .mockResolvedValue({ is_error: true, api_error_status: 429, result: 'limit' })
    await expect(generateTopics([makeCandidate()], transientCall)).rejects.toBeInstanceOf(AllTopicsFailedError)
    await expect(generateTopics([makeCandidate()], quotaCall)).rejects.not.toBeInstanceOf(AllTopicsFailedError)
  })
})
