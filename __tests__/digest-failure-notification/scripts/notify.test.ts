import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import { run } from '../../../scripts/digest-failure-notification/notify'

let fetchMock: MockInstance<typeof fetch>
let consoleErrorSpy: MockInstance<typeof console.error>

const BASE_ENV = {
  WORKFLOW_NAME: 'AI駆動開発ダイジェスト 日次記事公開',
  CONCLUSION: 'failure',
  EVENT: 'schedule',
  CREATED_AT: '2026-10-21T00:43:00Z',
  UPDATED_AT: '2026-10-21T00:50:00Z',
  HTML_URL: 'https://github.com/zakiyama0108/benriyatool/actions/runs/123',
  LINE_CHANNEL_ACCESS_TOKEN: 'test-access-token',
  LINE_ADMIN_USER_ID: 'test-admin-user-id',
}

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

// 仕様: specs/digest-failure-notification/requirements.md#失敗検知・通知-3
describe('通知CLI - workflow_runイベント情報から判定し、通知対象の場合のみLINE Messaging APIのpushメッセージを送信する', () => {
  it('通知対象でないイベント(例: conclusionがsuccess)の場合、LINE APIを呼ばずに終了すること', async () => {
    await run({ ...BASE_ENV, CONCLUSION: 'success' })

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('通知対象のイベント(即時通知グループの失敗)の場合、組み立てたメッセージでLINE pushメッセージ送信エンドポイントへPOSTすること', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 200 }))

    await run(BASE_ENV)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.line.me/v2/bot/message/push')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-access-token')

    const body = JSON.parse(init.body as string) as { to: string; messages: { type: string; text: string }[] }
    expect(body.to).toBe('test-admin-user-id')
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].type).toBe('text')
    expect(body.messages[0].text).toContain('ai-dev-digest')
    expect(body.messages[0].text).toContain(BASE_ENV.HTML_URL)
  })
})

// 仕様: specs/digest-failure-notification/design.md#エラーハンドリング
describe('通知CLI - LINE push APIがエラーを返した場合、リトライせずHTTPステータスを記録して異常終了する', () => {
  it('LINE push APIが200以外のレスポンス(例: 429)を返した場合、リトライせず1回のみ送信され、HTTPステータスがconsole.errorに記録されたうえで例外が投げられること', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: '月間の無料メッセージ数上限に達しました' }), { status: 429 })
    )

    await expect(run(BASE_ENV)).rejects.toThrow()

    expect(fetchMock).toHaveBeenCalledTimes(1) // リトライしないこと

    const errorLogs = consoleErrorSpy.mock.calls.map((args) => args.join(' '))
    expect(errorLogs.some((line) => line.includes('429'))).toBe(true)

    // Authorizationヘッダー(チャネルアクセストークン)がログに出力されていないこと
    // (design.md「セキュリティ」「ログ」)
    expect(errorLogs.some((line) => line.includes('test-access-token'))).toBe(false)
  })
})
