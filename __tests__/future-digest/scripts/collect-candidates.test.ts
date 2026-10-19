import { describe, it, expect, vi } from 'vitest'
import {
  collectForGenre,
  buildClaudeArgs,
  buildPrompt,
  TimeoutError,
  QuotaExhaustedError,
  type ClaudeCliResponse,
  type CollectCallFn,
} from '../../../scripts/future-digest/collect-candidates'
import type { GenreConfig } from '../../../app/future-digest/lib/genres'
import type { DeliveredIndex } from '../../../app/future-digest/lib/deliveredIndex'
import type { FixedSourceHint } from '../../../app/future-digest/lib/fixedSourceTypes'

const GENRE: GenreConfig = {
  id: 'technology-ai',
  label: 'テクノロジー・AI',
  description: '説明',
  edition: 'science-tech',
  active: true,
  lineExcluded: false,
}
const HORIZONS: ['near', 'long'] = ['near', 'long']

function rawCandidate(overrides: Record<string, unknown> = {}) {
  return {
    impact: 'high',
    impactRank: 1,
    impactReason: '根拠',
    targetPeriod: '2030年まで',
    sourceTitle: 'サンプル記事',
    sourceName: 'サンプル情報源',
    sourceUrl: 'https://example.com/a',
    publishedAt: null,
    ...overrides,
  }
}

function okResponse(near: unknown[] = [rawCandidate()], long: unknown[] = []): ClaudeCliResponse {
  return { result: JSON.stringify({ near, long }) }
}

// 仕様: specs/future-digest/content-selection/requirements.md#収集失敗-1、specs/future-digest/content-selection/requirements.md#収集失敗-2、specs/future-digest/content-selection/requirements.md#収集失敗-3、specs/future-digest/content-selection/design.md「ジャンルごとに候補を集める処理」手順6〜7、specs/future-digest/content-selection/design.md「エラーハンドリング」
describe('ジャンル1つ分の収集 - Claude Code CLIの応答から候補を集め、失敗を分類してやり直す', () => {
  it('応答JSONから候補が取り出され、genre・horizonが補われること', async () => {
    const call: CollectCallFn = vi.fn().mockResolvedValue(okResponse())
    const result = await collectForGenre(GENRE, HORIZONS, call)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.candidates).toHaveLength(1)
      expect(result.candidates[0]).toMatchObject({ genre: 'technology-ai', horizon: 'near' })
    }
  })

  it('JSONを取り出せない応答は1回だけやり直され、2回目に成功すれば結果に反映されること', async () => {
    const call = vi
      .fn<CollectCallFn>()
      .mockResolvedValueOnce({ result: '聞き返しの文章です' })
      .mockResolvedValueOnce(okResponse())
    const result = await collectForGenre(GENRE, HORIZONS, call)
    expect(result.status).toBe('ok')
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('2回ともJSONを取り出せない場合、invalid-formatの分類ラベルつきの収集失敗として返り例外にしないこと', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue({ result: '聞き返しの文章です' })
    const result = await collectForGenre(GENRE, HORIZONS, call)
    expect(result).toEqual({ status: 'collection-failed', reason: 'invalid-format' })
  })

  it('応答の形(時間軸ごとの候補配列)自体が満たされない場合も、1回だけやり直し、2回とも満たさなければinvalid-formatの収集失敗として返ること', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue({ result: JSON.stringify({ near: 'not-an-array', long: [] }) })
    const result = await collectForGenre(GENRE, HORIZONS, call)
    expect(result).toEqual({ status: 'collection-failed', reason: 'invalid-format' })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('呼び出しがタイムアウトした場合は1回だけやり直し、2回とも超えたらtimeoutの分類ラベルで返ること', async () => {
    const call = vi.fn<CollectCallFn>().mockRejectedValue(new TimeoutError('タイムアウトしました'))
    const result = await collectForGenre(GENRE, HORIZONS, call)
    expect(result).toEqual({ status: 'collection-failed', reason: 'timeout' })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('その他の異常終了は2回とも失敗したらotherの分類ラベルで返ること', async () => {
    const call = vi.fn<CollectCallFn>().mockRejectedValue(new Error('予期しないエラー'))
    const result = await collectForGenre(GENRE, HORIZONS, call)
    expect(result).toEqual({ status: 'collection-failed', reason: 'other' })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('Claude CLIが異常終了(is_error)した場合、利用上限以外はinvalid-formatではなくotherの分類ラベルで返ること(design.md「エラーハンドリング」)', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue({
      is_error: true,
      result: '予期しないエラーで終了しました',
    })
    const result = await collectForGenre(GENRE, HORIZONS, call)
    expect(result).toEqual({ status: 'collection-failed', reason: 'other' })
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('利用上限への到達を示す応答では、やり直さずに打ち切りを示す例外(QuotaExhaustedError)を投げること(収集失敗にはしない)', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue({
      is_error: true,
      api_error_status: 429,
      result: "You've hit your weekly limit",
    })
    await expect(collectForGenre(GENRE, HORIZONS, call)).rejects.toBeInstanceOf(QuotaExhaustedError)
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('候補単位のバリデーションで個々の候補が捨てられ0件になった場合、収集失敗にせず0件の候補配列を返す成功として扱うこと(境界ケース)', async () => {
    const call = vi.fn<CollectCallFn>().mockResolvedValue(okResponse([rawCandidate({ impactReason: '' })], []))
    const result = await collectForGenre(GENRE, HORIZONS, call)
    expect(result).toEqual({ status: 'ok', candidates: [] })
    expect(call).toHaveBeenCalledTimes(1) // バリデーションで0件になっただけなのでやり直さない
  })
})

// 仕様: specs/future-digest/content-selection/design.md「セキュリティ」
describe('Claude Code CLIの起動引数 - 危険な許可フラグを付けず、利用可能・許可ツールをWebSearch・WebFetchに限定する', () => {
  it('--dangerously-skip-permissionsを含まないこと', () => {
    const args = buildClaudeArgs('プロンプト')
    expect(args).not.toContain('--dangerously-skip-permissions')
  })

  it('--toolsでWebSearch・WebFetchのみ利用可能にすること(Bash・Read・Edit等を呼び出し不能にする)', () => {
    const args = buildClaudeArgs('プロンプト')
    expect(args).toContain('--tools')
    expect(args[args.indexOf('--tools') + 1]).toBe('WebSearch,WebFetch')
  })

  it('--allowedToolsで確認なしに使えるツールもWebSearch・WebFetchのみに限定すること', () => {
    const args = buildClaudeArgs('プロンプト')
    expect(args).toContain('--allowedTools')
    expect(args[args.indexOf('--allowedTools') + 1]).toBe('WebSearch,WebFetch')
  })
})

const EMPTY_DELIVERED: DeliveredIndex = { urls: new Set(), lines: [] }

// 仕様: specs/future-digest/content-selection/requirements.md#情報源(固定リスト)-1、specs/future-digest/content-selection/design.md「ジャンルごとに候補を集める処理」手順1
describe('収集プロンプトの組み立て - 固定情報源のヒントがある場合はプロンプトに含め、無条件に採用しないことを明示する', () => {
  it('ヒントがある場合、見出し・URLがプロンプトに含まれること', () => {
    const hints: FixedSourceHint[] = [{ sourceName: 'MIT Technology Review', title: '見出しA', url: 'https://www.technologyreview.com/a', publishedAt: 'Fri, 16 Oct 2026' }]
    const prompt = buildPrompt(GENRE, HORIZONS, EMPTY_DELIVERED, '要件定義本文', '2026-10-22', hints)
    expect(prompt).toContain('見出しA')
    expect(prompt).toContain('https://www.technologyreview.com/a')
    expect(prompt).toContain('無条件に採用せず')
  })

  it('ヒントがない場合(空配列)、「ヒントはありません」と分かる記載になること', () => {
    const prompt = buildPrompt(GENRE, HORIZONS, EMPTY_DELIVERED, '要件定義本文', '2026-10-22', [])
    expect(prompt).toContain('固定情報源のヒントはありません')
  })

  it('ヒントを渡さない場合(デフォルト引数)もヒントなしの記載になること(既存呼び出し元との互換性)', () => {
    const prompt = buildPrompt(GENRE, HORIZONS, EMPTY_DELIVERED, '要件定義本文', '2026-10-22')
    expect(prompt).toContain('固定情報源のヒントはありません')
  })
})
