import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import ArticleDetailView from '../../../app/future-digest/components/ArticleDetailView'
import type { Article, Prediction } from '../../../app/future-digest/lib/types'
import { GENRE_ORDER } from '../../../app/future-digest/lib/types'
import { getSession, onAuthChange, isAuthorizedAdmin } from '../../../app/lib/adminAuth'

vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}))
// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるが、本テストはisAdmin判定・
// 並び順切り替えのみを検証するためモックする
vi.mock('../../../app/future-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

const getSessionMock = vi.mocked(getSession)
const onAuthChangeMock = vi.mocked(onAuthChange)
const isAuthorizedAdminMock = vi.mocked(isAuthorizedAdmin)

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

function makePrediction(overrides: Partial<Prediction>): Prediction {
  return {
    id: `${overrides.genre}--${overrides.horizon}`,
    genre: GENRE_ORDER[0],
    horizon: 'near',
    heading: '見出し',
    body: 'あ'.repeat(200),
    impact: 'medium',
    impactReason: '根拠',
    targetPeriod: '2030年まで',
    sourceTitle: '元記事',
    sourceName: '情報源',
    sourceUrl: 'https://example.com/a',
    ...overrides,
  }
}

const article: Article = {
  id: '2026-09-24',
  date: '2026-09-24',
  issueNumber: 1,
  predictions: [
    makePrediction({ genre: GENRE_ORDER[1], horizon: 'near', impact: 'low', heading: 'ジャンル2の予測' }),
    makePrediction({ genre: GENRE_ORDER[0], horizon: 'near', impact: 'high', heading: 'ジャンル1の予測' }),
  ],
  emptySlots: [],
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  getSessionMock.mockReset().mockResolvedValue(null)
  onAuthChangeMock.mockReset().mockReturnValue(() => {})
  isAuthorizedAdminMock.mockReset()
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

// 仕様: specs/future-digest/article-detail/requirements.md#並び順の切り替え-7、specs/future-digest/article-detail/requirements.md#並び順の切り替え-10
describe('記事詳細ページの並び順切り替え - 初期表示は影響度順で、切り替えるとジャンル順に並び直る', () => {
  it('初期表示では影響度の大きい予測(ジャンル1)が先に表示されること', () => {
    render(<ArticleDetailView article={article} />)
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['ジャンル1の予測', 'ジャンル2の予測'])
  })

  it('「ジャンル順」を押すと、ジャンルの定義順(ジャンル1→ジャンル2)に並び替わること', () => {
    render(<ArticleDetailView article={article} />)
    fireEvent.click(screen.getByRole('button', { name: 'ジャンル順' }))
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(headings).toEqual(['ジャンル1の予測', 'ジャンル2の予測'])
  })
})

// 仕様: specs/future-digest/article-detail/requirements.md#運営者向けフィードバック-11、specs/future-digest/article-detail/requirements.md#フィードバックの保存・権限-3
describe('記事詳細ページでの運営者判定 - セッション確立後にisAuthorizedAdmin()を呼び出し、許可対象の場合だけフィードバック入力欄を表示する', () => {
  it('セッションがない場合、isAuthorizedAdmin()自体が呼び出されず、フィードバック入力欄も表示されないこと', async () => {
    getSessionMock.mockResolvedValue(null)
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())
    expect(isAuthorizedAdminMock).not.toHaveBeenCalled()
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('セッションがあり、isAuthorizedAdmin()がtrueを返す場合、各予測の下にフィードバック入力欄が表示されること', async () => {
    getSessionMock.mockResolvedValue(makeSession('admin@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(true)
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(screen.queryAllByRole('textbox')).toHaveLength(2))
  })

  it('セッションがあっても、isAuthorizedAdmin()がfalseを返す場合はフィードバック入力欄が表示されないこと', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(false)
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(isAuthorizedAdminMock).toHaveBeenCalled())
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('isAuthorizedAdmin()が例外を投げた場合、フィードバック入力欄を表示せずコンソールにエラーを出力すること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    isAuthorizedAdminMock.mockRejectedValue(new Error('network error'))
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled())
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })
})
