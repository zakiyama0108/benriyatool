import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import ArticleDetailView from '../../../app/trend-digest/components/ArticleDetailView'
import type { Article } from '../../../app/trend-digest/lib/types'
import { getSession, onAuthChange, isAuthorizedAdmin } from '../../../app/lib/adminAuth'

vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}))
// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるが、本テストは
// isAdmin判定によるフィードバック欄の表示切り替えのみを検証するためモックする
vi.mock('../../../app/trend-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

const getSessionMock = vi.mocked(getSession)
const onAuthChangeMock = vi.mocked(onAuthChange)
const isAuthorizedAdminMock = vi.mocked(isAuthorizedAdmin)

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

const article: Article = {
  id: '2026-09-15-entertainment',
  edition: 'entertainment',
  date: '2026-09-15',
  topics: [
    {
      id: 'topic-1',
      genre: 'music',
      heading: '新曲がストリーミングで急上昇',
      body: 'あるアーティストの新曲がストリーミングサービスの週間ランキングで急上昇した。',
      sourceTitle: 'サンプル楽曲A',
      sourceName: 'Oricon',
      sourceUrl: 'https://example.com/oricon/a',
    },
  ],
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  getSessionMock.mockReset().mockResolvedValue(null)
  onAuthChangeMock.mockReset().mockReturnValue(() => {})
  isAuthorizedAdminMock.mockReset()
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

// 仕様: specs/trend-digest/article-detail/requirements.md#運営者向けフィードバック-6、specs/trend-digest/article-detail/requirements.md#フィードバックの保存・権限-4、specs/trend-digest/article-detail/design.md#ログイン状態に応じてフィードバック入力欄の表示を切り替える処理
describe('記事詳細ページでの運営者判定 - セッション確立後にisAuthorizedAdmin()を呼び出し、結果をisAdminとしてGenreSection経由でTopicCardへ渡す', () => {
  it('セッションがない場合、isAuthorizedAdmin()自体が呼び出されず、フィードバック入力欄も表示されないこと', async () => {
    getSessionMock.mockResolvedValue(null)
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())
    expect(isAuthorizedAdminMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('セッションがあり、isAuthorizedAdmin()がtrueを返す場合、フィードバック入力欄が表示されること', async () => {
    getSessionMock.mockResolvedValue(makeSession('admin@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(true)
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(screen.getByRole('textbox')).toBeTruthy())
  })

  it('セッションがあっても、isAuthorizedAdmin()がfalseを返す場合はフィードバック入力欄が表示されないこと', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(false)
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(isAuthorizedAdminMock).toHaveBeenCalled())
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('isAuthorizedAdmin()が例外を投げた場合、フィードバック入力欄を表示せずコンソールにエラーを出力すること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    isAuthorizedAdminMock.mockRejectedValue(new Error('network error'))
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled())
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
