import { describe, it, expect, vi } from 'vitest'
import {
  collectForGenre,
  buildClaudeArgs,
  TimeoutError,
  QuotaExhaustedError,
  type ClaudeCliResponse,
  type CollectCallFn,
} from '../../../scripts/research-digest/collect-candidates'
import type { GenreConfig } from '../../../app/research-digest/lib/genres'

const GENRE: GenreConfig = { id: 'medical-health', label: '医療・健康', description: '説明', edition: 'body-life', active: true }
const TODAY = new Date('2026-10-05T12:00:00')

function rawCandidate(overrides: Record<string, unknown> = {}) {
  return {
    impact: 'high',
    impactRank: 1,
    impactReason: '根拠',
    sourceTitle: 'サンプル論文',
    sourceName: 'サンプル学術誌',
    sourceUrl: 'https://example.com/a',
    doi: '10.1000/abc',
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

function okResponse(candidates: unknown[] = [rawCandidate()]): ClaudeCliResponse {
  return { result: JSON.stringify(candidates) }
}

const collect = (call: CollectCallFn) => collectForGenre(GENRE, call, { today: TODAY })

// 仕様: specs/research-digest/content-selection/requirements.md#収集失敗-1、specs/research-digest/content-selection/requirements.md#収集失敗-2、specs/research-digest/content-selection/requirements.md#収集失敗-3
describe('ジャンル1つ分の収集 - Claude Code CLIの応答から候補を集め、失敗を分類ラベルに変換してやり直す', () => {
  it('応答JSONから候補が取り出され、ジャンルが補われること', async () => {
    const result = await collect(vi.fn<CollectCallFn>().mockResolvedValue(okResponse()))
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.candidates).toHaveLength(1)
      expect(result.candidates[0]).toMatchObject({ genre: 'medical-health', impact: 'high' })
    }
  })

  it('JSONを取り出せない応答は1回だけやり直され、2回目に成功すれば結果に反映されること', async () => {
    const call = vi
      .fn<CollectCallFn>()
      .mockResolvedValueOnce({ result: '聞き返しの文章です' })
      .mockResolvedValueOnce(okResponse())
    const result = await collect(call)
    expect(result.status).toBe('ok')
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('2回ともJSONを取り出せない場合、invalid-formatの分類ラベルつきの収集失敗として返り例外にしないこと', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue({ result: '聞き返しの文章です' })
    expect(await collect(call)).toEqual({ status: 'collection-failed', reason: 'invalid-format' })
  })

  it('応答の形(候補の配列)自体が読めない場合も1回だけやり直し、2回とも満たさなければinvalid-formatの収集失敗として返ること', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue({ result: '[not json]' })
    expect(await collect(call)).toEqual({ status: 'collection-failed', reason: 'invalid-format' })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('呼び出しがタイムアウトした場合は1回だけやり直し、2回とも超えたらtimeoutの分類ラベルで返ること', async () => {
    const call = vi.fn<CollectCallFn>().mockRejectedValue(new TimeoutError('タイムアウトしました'))
    expect(await collect(call)).toEqual({ status: 'collection-failed', reason: 'timeout' })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('その他の例外による異常終了は、2回とも失敗したらotherの分類ラベルで返ること', async () => {
    const call = vi.fn<CollectCallFn>().mockRejectedValue(new Error('予期しないエラー'))
    expect(await collect(call)).toEqual({ status: 'collection-failed', reason: 'other' })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('Claude CLIが異常終了(利用上限以外)した場合は、応答形式不正ではなくotherの分類ラベルで返ること', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue({ is_error: true, result: '予期しないエラーで終了しました' })
    expect(await collect(call)).toEqual({ status: 'collection-failed', reason: 'other' })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('利用上限への到達を示す応答では、やり直さずに打ち切りを示す例外を投げること(そのジャンルだけの収集失敗にはしない)', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue({
      is_error: true,
      api_error_status: 429,
      result: "You've hit your weekly limit",
    })
    await expect(collect(call)).rejects.toBeInstanceOf(QuotaExhaustedError)
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('候補が空の配列で返ってきた場合は、収集失敗ではなく0件の成功として扱うこと', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue(okResponse([]))
    expect(await collect(call)).toEqual({ status: 'ok', candidates: [] })
  })

  it('候補ごとの検証で個々の候補が捨てられ0件になった場合も、収集失敗にせず0件の成功として扱い、やり直さないこと(境界ケース)', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue(okResponse([rawCandidate({ impactReason: '' })]))
    expect(await collect(call)).toEqual({ status: 'ok', candidates: [] })
    expect(call).toHaveBeenCalledTimes(1)
  })
})

// 仕様: specs/research-digest/content-selection/design.md「セキュリティ」
describe('収集時のClaude Code CLIの起動条件 - 危険な許可フラグを付けず、使えるツールをWebSearch・WebFetchに限定する', () => {
  it('--dangerously-skip-permissionsを含まないこと', () => {
    expect(buildClaudeArgs('プロンプト')).not.toContain('--dangerously-skip-permissions')
  })

  it('--toolsでWebSearch・WebFetchのみ利用可能にすること(Bash・Read・Edit等を呼び出し不能にする)', () => {
    const args = buildClaudeArgs('プロンプト')
    expect(args[args.indexOf('--tools') + 1]).toBe('WebSearch,WebFetch')
  })

  it('--allowedToolsで確認なしに使えるツールもWebSearch・WebFetchのみに限定すること', () => {
    const args = buildClaudeArgs('プロンプト')
    expect(args[args.indexOf('--allowedTools') + 1]).toBe('WebSearch,WebFetch')
  })
})
