import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isTestData, saveFeedback } from '../../../app/ai-dev-digest/lib/saveFeedback'

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
  window.history.replaceState(null, '', '/ai-dev-digest/')
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#フィードバックの保存・権限-3
describe('テストデータの判定 - 開発環境またはURLのtest=1パラメータで動作確認用の投稿かを判定する(life-money-sim/lib/saveResult.tsと同一ロジック)', () => {
  it('開発サーバー(開発環境)で動かしている場合、テストデータと判定されること', () => {
    vi.stubEnv('NODE_ENV', 'development')
    expect(isTestData()).toBe(true)
  })

  it('本番ビルドでもURLにtest=1パラメータを付けて開いている場合、テストデータと判定されること', () => {
    vi.stubEnv('NODE_ENV', 'production')
    window.history.replaceState(null, '', '/ai-dev-digest/2026-08-01/?test=1')
    expect(isTestData()).toBe(true)
  })

  it('本番ビルドでURLにパラメータがない場合、テストデータではないと判定されること', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(isTestData()).toBe(false)
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#運営者向けフィードバック-7、specs/ai-dev-digest/article-detail/requirements.md#フィードバックの保存・権限-3
describe('フィードバックの保存 - 記事日付・トピックID・入力内容をai_dev_digest_feedbackテーブルへinsertする', () => {
  it('article_date・topic_id・comment・is_testが正しいカラム名でinsertされ、保存成功時にtrueが返ること', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await expect(saveFeedback({ articleDate: '2026-08-01', topicId: 'topic-1', comment: 'この選定はもう不要かもしれません' })).resolves.toBe(
      true
    )

    expect(fromMock).toHaveBeenCalledWith('ai_dev_digest_feedback')
    expect(insertMock).toHaveBeenCalledWith({
      article_date: '2026-08-01',
      topic_id: 'topic-1',
      comment: 'この選定はもう不要かもしれません',
      is_test: false,
    })
  })

  it('Supabaseが{error}を返した場合(RLS拒否等)、falseが返ること', async () => {
    insertMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })
    await expect(saveFeedback({ articleDate: '2026-08-01', topicId: 'topic-1', comment: 'コメント' })).resolves.toBe(false)
  })

  it('Supabaseへの保存が例外を投げても、エラーを外に投げずfalseで正常終了すること', async () => {
    insertMock.mockRejectedValue(new Error('network error'))
    await expect(saveFeedback({ articleDate: '2026-08-01', topicId: 'topic-1', comment: 'コメント' })).resolves.toBe(false)
  })
})
