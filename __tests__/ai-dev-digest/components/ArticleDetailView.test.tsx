import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import ArticleDetailView from '../../../app/ai-dev-digest/components/ArticleDetailView'
import type { Article } from '../../../app/ai-dev-digest/lib/types'
import { getSession, onAuthChange, isAuthorizedAdmin } from '../../../app/lib/adminAuth'
import { fetchBookmarksByArticleDate } from '../../../app/ai-dev-digest/lib/bookmarks'

vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}))
// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるが、本テストは
// isAdmin判定によるフィードバック欄の表示切り替えのみを検証するためモックする
vi.mock('../../../app/ai-dev-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))
vi.mock('../../../app/ai-dev-digest/lib/bookmarks', () => ({
  fetchBookmarksByArticleDate: vi.fn(),
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))

const getSessionMock = vi.mocked(getSession)
const onAuthChangeMock = vi.mocked(onAuthChange)
const isAuthorizedAdminMock = vi.mocked(isAuthorizedAdmin)
const fetchBookmarksByArticleDateMock = vi.mocked(fetchBookmarksByArticleDate)

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

const article: Article = {
  date: '2026-08-01',
  topics: [
    {
      id: 'topic-1',
      heading: 'Anthropicが新モデルを発表',
      sections: [{ heading: '何が発表されたか', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) }],
      sourceType: 'official',
      sourceName: 'Anthropic',
      sourceUrl: 'https://www.anthropic.com/news/example',
      belowCriteria: false,
    },
  ],
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  getSessionMock.mockReset().mockResolvedValue(null)
  onAuthChangeMock.mockReset().mockReturnValue(() => {})
  isAuthorizedAdminMock.mockReset()
  fetchBookmarksByArticleDateMock.mockReset().mockResolvedValue(new Map())
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#運営者向けフィードバック-7、specs/ai-dev-digest/article-detail/design.md「ログイン状態に応じてフィードバック入力欄の表示を切り替える処理」
describe('記事詳細ページでの運営者判定 - セッション確立後にisAuthorizedAdmin()を呼び出し、結果をisAdminとしてTopicSectionへ渡す', () => {
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

// 仕様: specs/ai-dev-digest/bookmark/design.md#エラーハンドリング
describe('記事詳細ページでの付箋取得 - セッション確立後にfetchBookmarksByArticleDate()を呼び出し、結果をbookmarkとしてTopicSectionへ渡す', () => {
  it('fetchBookmarksByArticleDate()が例外を投げた場合、コンソールにエラーを出力し、全トピックが未付箋(空のMap)のまま扱われること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(false)
    fetchBookmarksByArticleDateMock.mockRejectedValue(new Error('network error'))
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled())
    // 未付箋のトピックはBookmarkPanelが「付箋を貼る」ボタンを表示する(取得失敗時のフォールバック確認)
    expect(screen.getByRole('button', { name: '付箋を貼る' })).toBeTruthy()
  })
})
