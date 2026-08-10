import { describe, it, expect, vi } from 'vitest'
import {
  classifyGenerationResult,
  generateTopics,
  QuotaExhaustedError,
  AllTopicsFailedError,
  type ClaudeCliResponse,
} from '../../../app/ai-dev-digest/lib/generateContent'
import type { SelectedTopic } from '../../../app/ai-dev-digest/lib/candidateTypes'

// テスト用のSelectedTopicを組み立てる(生成失敗時の分類・リトライ・除外の検証に必要な最小限のフィールド)
function makeCandidate(overrides: Partial<SelectedTopic> = {}): SelectedTopic {
  return {
    sourceId: 'src-1',
    sourceName: '発信者A',
    sourceType: 'individual-blog',
    heading: '元タイトルA',
    url: 'https://example.com/a',
    publishedAt: '2026-08-10T00:00:00.000Z',
    metricValue: 0,
    meetsCriteria: true,
    belowCriteria: false,
    ...overrides,
  }
}

// 成功応答のresult文字列(JSONオブジェクト単体)を作る
function okResult(): ClaudeCliResponse {
  return {
    result: JSON.stringify({
      heading: '見出し',
      sections: [
        { heading: 'S1', teaser: '導入1', detail: '詳細1' },
        { heading: 'S2', teaser: '導入2', detail: '詳細2' },
      ],
    }),
  }
}

// 仕様: specs/ai-dev-digest/content-generation/design.md「要約を書く処理」手順8・「エラーハンドリング」
describe('classifyGenerationResult - CLI応答を成功/一時的失敗/利用枠枯渇の3種に分類する', () => {
  it('見出しと非空sections(2件)を含むJSON応答はokに分類する', () => {
    const c = classifyGenerationResult(okResult())
    expect(c.kind).toBe('ok')
    if (c.kind === 'ok') {
      expect(c.content.heading).toBe('見出し')
      expect(c.content.sections).toHaveLength(2)
    }
  })

  it('非空sectionが1件のみのJSON応答もokに分類する(空sectionsのみを失敗とする境界)', () => {
    const res: ClaudeCliResponse = {
      result: JSON.stringify({ heading: '見出し', sections: [{ heading: 'S1', teaser: '導入1', detail: '詳細1' }] }),
    }
    expect(classifyGenerationResult(res).kind).toBe('ok')
  })

  it('成功応答の記事本文が上限到達の英語文言を含んでいても、is_errorでない限りokに分類する(枯渇の誤検知防止)', () => {
    // ダイジェストの題材はAI開発ツールの利用上限が頻出テーマ。成功記事が "You've hit your weekly limit" 等を
    // 引用していても、api_error_statusもis_errorも無い成功応答を枯渇と誤判定して丸一日落とさないこと
    const res: ClaudeCliResponse = {
      result: JSON.stringify({
        heading: 'Claude Codeの週次上限について',
        sections: [
          { heading: '概要', teaser: '導入', detail: "記事中で「You've hit your weekly limit」という表示が紹介された。usage limit reached とも。" },
        ],
      }),
    }
    expect(classifyGenerationResult(res).kind).toBe('ok')
  })

  it('JSONを抽出できない応答(聞き返し等)はtransientに分類する', () => {
    const res: ClaudeCliResponse = { result: 'この動画は取得できませんでした。どう進めますか?案1/案2/案3' }
    expect(classifyGenerationResult(res).kind).toBe('transient')
  })

  it('空のsections配列はtransientに分類する', () => {
    const res: ClaudeCliResponse = { result: JSON.stringify({ heading: '見出し', sections: [] }) }
    expect(classifyGenerationResult(res).kind).toBe('transient')
  })

  it('sectionに空文字フィールドが混じる場合はtransientに分類する', () => {
    const res: ClaudeCliResponse = {
      result: JSON.stringify({ heading: '見出し', sections: [{ heading: 'S1', teaser: '', detail: '詳細' }] }),
    }
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
})

// 仕様: specs/ai-dev-digest/daily-publish/requirements.md#掲載件数の保証-3
describe('generateTopics - 個々の候補の生成失敗を除外し残りで公開する / 全候補失敗・枯渇は例外', () => {
  it('一時的失敗が初回に出てもリトライで成功した候補は結果に含まれる', async () => {
    const candidate = makeCandidate()
    const call = vi
      .fn<[SelectedTopic], Promise<ClaudeCliResponse>>()
      .mockResolvedValueOnce({ result: '取得できませんでした' }) // 1回目: transient
      .mockResolvedValueOnce(okResult()) // 2回目: ok
    const result = await generateTopics([candidate], call)
    expect(result).toHaveLength(1)
    expect(result[0].candidate.sourceId).toBe('src-1')
    expect(call).toHaveBeenCalledTimes(2)
  })

  it('最大2回(初回+1回)失敗する候補は除外され、成功した残りの候補で結果を返す', async () => {
    const failing = makeCandidate({ sourceId: 'fail', heading: '失敗候補' })
    const passing = makeCandidate({ sourceId: 'pass', heading: '成功候補' })
    const call = vi
      .fn<[SelectedTopic], Promise<ClaudeCliResponse>>()
      .mockImplementation((c: SelectedTopic) =>
        Promise.resolve(c.sourceId === 'fail' ? { result: 'だめ' } : okResult()),
      )
    const onExcluded = vi.fn()
    const result = await generateTopics([failing, passing], call, { onExcluded })
    expect(result.map((r) => r.candidate.sourceId)).toEqual(['pass'])
    // 失敗候補は初回+リトライ1回=2回呼ばれる
    expect(call).toHaveBeenCalledWith(failing)
    expect(onExcluded).toHaveBeenCalledTimes(1)
    expect(onExcluded).toHaveBeenCalledWith(expect.objectContaining({ candidate: failing }))
  })

  it('選定された全候補が失敗した場合はAllTopicsFailedErrorを投げる', async () => {
    const call = vi.fn<[SelectedTopic], Promise<ClaudeCliResponse>>().mockResolvedValue({ result: 'だめ' })
    await expect(generateTopics([makeCandidate()], call)).rejects.toBeInstanceOf(AllTopicsFailedError)
  })

  it('利用枠枯渇を検知したらリトライせず即座にQuotaExhaustedErrorを投げ、以降の候補を呼ばない', async () => {
    const first = makeCandidate({ sourceId: 'first' })
    const second = makeCandidate({ sourceId: 'second' })
    const call = vi.fn<[SelectedTopic], Promise<ClaudeCliResponse>>().mockResolvedValue({
      is_error: true,
      api_error_status: 429,
      result: "You've hit your weekly limit",
    })
    await expect(generateTopics([first, second], call)).rejects.toBeInstanceOf(QuotaExhaustedError)
    // 枯渇は即打ち切り: 1回目の候補で1回呼んだだけ(リトライも次候補もしない)
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('全候補失敗と利用枠枯渇の例外は互いに区別できる(型が異なる)', async () => {
    const transientCall = vi.fn<[SelectedTopic], Promise<ClaudeCliResponse>>().mockResolvedValue({ result: 'だめ' })
    const quotaCall = vi
      .fn<[SelectedTopic], Promise<ClaudeCliResponse>>()
      .mockResolvedValue({ is_error: true, api_error_status: 429, result: 'limit' })
    await expect(generateTopics([makeCandidate()], transientCall)).rejects.toBeInstanceOf(AllTopicsFailedError)
    await expect(generateTopics([makeCandidate()], quotaCall)).rejects.not.toBeInstanceOf(AllTopicsFailedError)
  })
})
