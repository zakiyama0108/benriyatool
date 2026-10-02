import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isTestData, saveFeedback } from '../../../app/research-digest/lib/saveFeedback'

const { insertMock, fromMock } = vi.hoisted(() => {
  const insertMock = vi.fn()
  const fromMock = vi.fn(() => ({ insert: insertMock }))
  return { insertMock, fromMock }
})

vi.mock('../../../app/lib/supabaseClient', () => ({
  supabase: { from: fromMock },
}))

beforeEach(() => {
  insertMock.mockReset().mockResolvedValue({ data: null, error: null })
  fromMock.mockClear()
})

afterEach(() => {
  vi.unstubAllEnvs()
  window.history.replaceState(null, '', '/research-digest/')
})

// 仕様: specs/research-digest/article-detail/requirements.md#フィードバックの保存・権限-2
describe('テストデータの判定 - 開発環境またはURLのtest=1パラメータで動作確認用の投稿かを判定する', () => {
  it('開発サーバー(開発環境)で動かしている場合、テストデータと判定されること', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(isTestData()).toBe(true)
  })

  it('本番ビルドでもURLにtest=1パラメータを付けて開いている場合、テストデータと判定されること', () => {
    vi.stubEnv('NODE_ENV', 'production')
    window.history.replaceState(null, '', '/research-digest/2026-10-05/?test=1')
    expect(isTestData()).toBe(true)
  })

  it('本番ビルドでURLにパラメータがない場合、テストデータではないと判定されること', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(isTestData()).toBe(false)
  })
})

// 仕様: specs/research-digest/article-detail/requirements.md#運営者向けフィードバック-12
describe('フィードバックの保存 - 記事ID・研究ID・入力内容を運営者向けフィードバックの保存先へ登録する', () => {
  it('記事ID・研究ID・入力内容・テスト判定が正しい項目名で保存され、成功時に成功が返ること', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await expect(
      saveFeedback({ articleId: '2026-10-05', findingId: 'medical-health', comment: 'この選定は良かったです' })
    ).resolves.toBe(true)

    expect(fromMock).toHaveBeenCalledWith('research_digest_feedback')
    expect(insertMock).toHaveBeenCalledWith({
      article_id: '2026-10-05',
      finding_id: 'medical-health',
      comment: 'この選定は良かったです',
      is_test: false,
    })
  })

  it('保存先がエラーを返した場合(運営者以外の書き込み拒否など)、失敗が返ること', async () => {
    insertMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    await expect(
      saveFeedback({ articleId: '2026-10-05', findingId: 'medical-health', comment: 'コメント' })
    ).resolves.toBe(false)
  })

  it('保存中に通信エラーで例外が起きても、例外を外に投げず失敗として返ること', async () => {
    insertMock.mockRejectedValue(new Error('network error'))
    await expect(
      saveFeedback({ articleId: '2026-10-05', findingId: 'medical-health', comment: 'コメント' })
    ).resolves.toBe(false)
  })
})
