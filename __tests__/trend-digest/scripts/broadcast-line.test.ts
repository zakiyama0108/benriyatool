import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { broadcastArticle } from '../../../scripts/trend-digest/broadcast-line'

const FIXTURE_PATH = path.join(
  process.cwd(),
  '__tests__/trend-digest/fixtures/articles-valid/2026-09-15-entertainment.json'
)

let fetchMock: MockInstance<typeof fetch>

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// 仕様: specs/trend-digest/line-broadcast/requirements.md#配信タイミング・方式-7、specs/trend-digest/line-broadcast/requirements.md#無料枠と配信失敗時の扱い-3、specs/trend-digest/line-broadcast/requirements.md#無料枠と配信失敗時の扱い-4
describe('LINEブロードキャスト送信 - LINE Messaging APIの一斉配信エンドポイントへ送信し、成否をリトライなしで記録する', () => {
  it('記事ページの公開確認(GET)が200を返した場合、友だち全員への一斉配信エンドポイントへ1件のテキストメッセージが送信され、配信成功として扱われること', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // 記事ページの公開確認
      .mockResolvedValueOnce(new Response('{}', { status: 200 })) // LINE配信API

    const result = await broadcastArticle(FIXTURE_PATH, 'test-access-token')

    expect(result).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2) // 公開確認1回 + LINE配信1回
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(url).toBe('https://api.line.me/v2/bot/message/broadcast')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-access-token')
    const body = JSON.parse(init.body as string) as { messages: { type: string; text: string }[] }
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].type).toBe('text')
  })

  it('記事ページの公開確認は成功したがLINE配信APIがエラーレスポンス(例: 月間無料通数超過)を返した場合、リトライせず1回のみ送信され、配信失敗として扱われること', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // 記事ページの公開確認
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: '月間の無料メッセージ数上限に達しました' }), { status: 429 })
      )

    const result = await broadcastArticle(FIXTURE_PATH, 'test-access-token')

    expect(result).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2) // 公開確認1回 + LINE配信1回(リトライしないこと)
  })
})

// 仕様: specs/trend-digest/line-broadcast/requirements.md#配信タイミング・方式-8、specs/trend-digest/line-broadcast/requirements.md#配信タイミング・方式-9
describe('LINEブロードキャスト送信 - 記事ページの公開が確認できるまで待ってから配信する(デプロイ完了前配信の防止)', () => {
  it('記事ページの公開確認が既定の時間内に取れず時間切れになった場合、LINE APIを呼ばずに配信失敗として扱われること', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 404 })) // デプロイ未完了を模した404が続く
    const sleep = vi.fn().mockResolvedValue(undefined)

    const result = await broadcastArticle(FIXTURE_PATH, 'test-access-token', {
      pollIntervalMs: 1000,
      timeoutMs: 2000,
      sleep,
    })

    expect(result).toBe(false)
    // LINE配信エンドポイントへのPOSTが一度も行われていないこと(公開確認のGETのみ呼ばれる)
    const lineApiCalls = fetchMock.mock.calls.filter(([url]) => url === 'https://api.line.me/v2/bot/message/broadcast')
    expect(lineApiCalls).toHaveLength(0)
  })
})

// 仕様: specs/trend-digest/line-broadcast/design.md#エラーハンドリング
describe('LINEブロードキャスト送信 - 記事データのパースに失敗した場合は配信を行わない(防御的な検証)', () => {
  it('記事データのパースに失敗した場合、配信を行わず例外が投げられること', async () => {
    const invalidPath = path.join(
      process.cwd(),
      '__tests__/trend-digest/fixtures/articles-invalid/2026-09-15-entertainment.json'
    )
    // フィクスチャの存在を前提とする(article-detailで用意済み)
    expect(fs.existsSync(invalidPath)).toBe(true)

    await expect(broadcastArticle(invalidPath, 'test-access-token')).rejects.toThrow()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
