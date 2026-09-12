import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import ArticleDetailView from '../../../app/news-digest/components/ArticleDetailView'
import type { Article } from '../../../app/news-digest/lib/types'
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
vi.mock('../../../app/news-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

const getSessionMock = vi.mocked(getSession)
const onAuthChangeMock = vi.mocked(onAuthChange)
const isAuthorizedAdminMock = vi.mocked(isAuthorizedAdmin)

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

const article: Article = {
  date: '2026-09-09',
  topics: [
    {
      id: 'topic-1',
      heading: '保育料の一部が来年度から無償化される',
      category: 'childcare',
      summary: {
        whatHappened: { heading: '何が起きたか', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(250) },
        whyItMatters: { heading: 'なぜ重要か', teaser: 'い'.repeat(60), detail: 'い'.repeat(250) },
        background: { heading: '背景', teaser: 'う'.repeat(60), detail: 'う'.repeat(250) },
        outlook: { heading: '今後の見通し', teaser: 'え'.repeat(60), detail: 'え'.repeat(250) },
      },
      importance: 4,
      sourceName: 'こども家庭庁',
      sourceUrl: 'https://www.cfa.go.jp/news/example',
      belowCriteria: false,
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

// 仕様: specs/news-digest/article-detail/requirements.md#運営者向けフィードバック-9、specs/news-digest/article-detail/design.md#ログイン状態に応じてフィードバック入力欄の表示を切り替える処理
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

// 仕様: specs/news-digest/article-detail/requirements.md#記事本文表示-1
describe('記事詳細ページの見出し表示 - buildArticleTitle(date)で導出したタイトル・公開日を表示する', () => {
  it('記事タイトルと公開日(date)が表示されること', async () => {
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())
    expect(screen.getByRole('heading', { level: 1, name: '2026年9月9日週の重要ニュース' })).toBeTruthy()
    expect(screen.getByText('2026-09-09')).toBeTruthy()
  })
})
