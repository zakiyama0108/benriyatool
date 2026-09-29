import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import ArticleDetailView from '../../../app/research-digest/components/ArticleDetailView'
import type { Article, Finding } from '../../../app/research-digest/lib/types'
import { GENRE_ORDER } from '../../../app/research-digest/lib/types'
import { getSession, onAuthChange, isAuthorizedAdmin } from '../../../app/lib/adminAuth'

vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}))
// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるため、モックする
vi.mock('../../../app/research-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

const getSessionMock = vi.mocked(getSession)
const onAuthChangeMock = vi.mocked(onAuthChange)
const isAuthorizedAdminMock = vi.mocked(isAuthorizedAdmin)

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

function makeFinding(overrides: Partial<Finding>): Finding {
  const genre = overrides.genre ?? GENRE_ORDER[0]
  return {
    id: genre,
    genre,
    heading: '見出し',
    body: 'あ'.repeat(200),
    impact: 'medium',
    impactReason: '根拠',
    sourceTitle: '論文名',
    sourceName: '学術誌',
    sourceUrl: 'https://example.com/a',
    doi: null,
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

const article: Article = {
  id: '2026-10-05',
  date: '2026-10-05',
  findings: [
    makeFinding({ genre: GENRE_ORDER[1], impact: 'low', heading: 'ジャンル2の研究' }),
    makeFinding({ genre: GENRE_ORDER[0], impact: 'high', heading: 'ジャンル1の研究' }),
  ],
  emptyGenres: [],
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  getSessionMock.mockReset().mockResolvedValue(null)
  onAuthChangeMock.mockReset().mockReturnValue(() => {})
  isAuthorizedAdminMock.mockReset().mockResolvedValue(false)
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})

const headings = () => screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)

// 仕様: specs/research-digest/article-detail/requirements.md#記事本文の表示-1
describe('記事詳細ページの見出し - 記事タイトルと公開日を表示する', () => {
  it('記事タイトルと公開日が表示されること', () => {
    render(<ArticleDetailView article={article} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('週刊研究発見 2026年10月5日号')
    expect(screen.getByText('2026-10-05')).toBeTruthy()
  })
})

// 仕様: specs/research-digest/article-detail/requirements.md#並び順の切り替え-7、specs/research-digest/article-detail/requirements.md#並び順の切り替え-10
describe('記事詳細ページの並び順切り替え - 初期表示は影響度順で、切り替えるとジャンル順に並び直る', () => {
  it('初期表示では影響度の大きい研究(ジャンル1)が先に表示されること', () => {
    const swapped: Article = {
      ...article,
      findings: [
        makeFinding({ genre: GENRE_ORDER[0], impact: 'low', heading: 'ジャンル1の研究' }),
        makeFinding({ genre: GENRE_ORDER[1], impact: 'high', heading: 'ジャンル2の研究' }),
      ],
    }
    render(<ArticleDetailView article={swapped} />)
    expect(headings()).toEqual(['ジャンル2の研究', 'ジャンル1の研究'])
  })

  it('「ジャンル順」を押すと、ジャンルの定義順に並び替わること', () => {
    const swapped: Article = {
      ...article,
      findings: [
        makeFinding({ genre: GENRE_ORDER[0], impact: 'low', heading: 'ジャンル1の研究' }),
        makeFinding({ genre: GENRE_ORDER[1], impact: 'high', heading: 'ジャンル2の研究' }),
      ],
    }
    render(<ArticleDetailView article={swapped} />)
    fireEvent.click(screen.getByRole('button', { name: 'ジャンル順' }))
    expect(headings()).toEqual(['ジャンル1の研究', 'ジャンル2の研究'])
  })
})

// 仕様: specs/research-digest/article-detail/requirements.md#運営者向けフィードバック-11、specs/research-digest/article-detail/requirements.md#フィードバックの保存・権限-3
describe('記事詳細ページでの運営者判定 - 運営者本人と確認できた場合だけフィードバック入力欄を表示する', () => {
  it('ログインしていない場合、運営者の確認自体を行わず、フィードバック入力欄も表示されないこと', async () => {
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())
    expect(isAuthorizedAdminMock).not.toHaveBeenCalled()
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('運営者本人と確認できた場合、研究がある各ジャンルの下にフィードバック入力欄が表示されること', async () => {
    getSessionMock.mockResolvedValue(makeSession('admin@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(true)
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(screen.queryAllByRole('textbox')).toHaveLength(2))
  })

  it('ログインしていても運営者本人でない場合は、フィードバック入力欄が表示されないこと', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    isAuthorizedAdminMock.mockResolvedValue(false)
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(isAuthorizedAdminMock).toHaveBeenCalled())
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })

  it('運営者の確認に失敗した場合、フィードバック入力欄を出さず、コンソールにだけエラーを出すこと', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    isAuthorizedAdminMock.mockRejectedValue(new Error('network error'))
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled())
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
  })
})
