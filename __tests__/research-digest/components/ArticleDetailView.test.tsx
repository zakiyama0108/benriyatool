import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import ArticleDetailView from '../../../app/research-digest/components/ArticleDetailView'
import type { Article, Finding } from '../../../app/research-digest/lib/types'
import { GENRE_ORDER } from '../../../app/research-digest/lib/types'
import { getSession, onAuthChange, isAuthorizedAdmin } from '../../../app/lib/adminAuth'
import { fetchBookmarksByArticle, createBookmark } from '../../../app/research-digest/lib/bookmarks'

vi.mock('../../../app/lib/adminAuth', () => ({
  getSession: vi.fn(),
  onAuthChange: vi.fn(() => () => {}),
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  isAuthorizedAdmin: vi.fn(),
}))
// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるため、モックする
vi.mock('../../../app/research-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

// 記事内の自分の付箋の取得(fetchBookmarksByArticle)をモックする
vi.mock('../../../app/research-digest/lib/bookmarks', () => ({
  fetchBookmarksByArticle: vi.fn(),
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))

const getSessionMock = vi.mocked(getSession)
const onAuthChangeMock = vi.mocked(onAuthChange)
const isAuthorizedAdminMock = vi.mocked(isAuthorizedAdmin)
const fetchBookmarksByArticleMock = vi.mocked(fetchBookmarksByArticle)
const createBookmarkMock = vi.mocked(createBookmark)

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
  fetchBookmarksByArticleMock.mockReset().mockResolvedValue(new Map())
  createBookmarkMock.mockReset()
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

// 仕様: specs/research-digest/bookmark/requirements.md#記事への付箋-5、specs/research-digest/bookmark/design.md「記事内の自分の付箋をまとめて取得する処理」
describe('記事詳細ページでの付箋の取得・表示 - ログイン中だけ記事内の自分の付箋をまとめて取得し、研究ごとに表示する', () => {
  it('ログインしていない場合、付箋の取得を行わず、付箋の操作(「付箋を貼る」)も表示されないこと', async () => {
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(getSessionMock).toHaveBeenCalled())
    expect(fetchBookmarksByArticleMock).not.toHaveBeenCalled()
    expect(screen.queryAllByRole('button', { name: '付箋を貼る' })).toHaveLength(0)
  })

  it('ログイン中は、記事IDで付箋を取得し、研究があるジャンルすべてに付箋の操作が表示されること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(fetchBookmarksByArticleMock).toHaveBeenCalledWith(article.id))
    await waitFor(() => expect(screen.getAllByRole('button', { name: '付箋を貼る' })).toHaveLength(2))
  })

  it('取得が遅れて届いた付箋が、該当する研究にだけ保存済みのメモとして表示されること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    let resolveFetch: (map: Map<string, { id: string; memo: string }>) => void = () => {}
    fetchBookmarksByArticleMock.mockReturnValue(new Promise((resolve) => { resolveFetch = resolve }))
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: '付箋を貼る' })).toHaveLength(2))

    resolveFetch(new Map([[GENRE_ORDER[0], { id: 'bookmark-1', memo: '遅れて届いたメモ' }]]))

    await waitFor(() => expect(screen.getByText('遅れて届いたメモ')).toBeTruthy())
    expect(screen.getAllByRole('button', { name: '付箋を貼る' })).toHaveLength(1)
  })

  it('付箋の取得に失敗した場合は、全ての研究が未付箋として扱われること(「付箋を貼る」だけが表示される)', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchBookmarksByArticleMock.mockRejectedValue(new Error('network error'))
    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: '付箋を貼る' })).toHaveLength(2))
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})

// 仕様: specs/research-digest/bookmark/design.md「コンポーネント設計」「状態管理」
describe('記事詳細ページでの付箋変更の反映 - 作成・編集・削除をその場で記事内の付箋一覧に反映する', () => {
  it('付箋を新規作成した直後に付箋の再取得が起きても、編集中のメモが消えないこと', async () => {
    // セッション取得のたびに新しいオブジェクトを返し、再ログイン等でログイン状態が更新されうる状況を再現する
    getSessionMock.mockImplementation(() => Promise.resolve(makeSession('reader@example.com')))
    let authChangeCallback: () => void = () => {}
    onAuthChangeMock.mockImplementation((cb: () => void) => {
      authChangeCallback = cb
      return () => {}
    })
    fetchBookmarksByArticleMock.mockResolvedValueOnce(new Map())
    createBookmarkMock.mockResolvedValue('bookmark-1')

    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: '付箋を貼る' })).toHaveLength(2))

    // 影響度順で先頭の研究(ジャンル1)に新規付箋を作成する
    fireEvent.click(screen.getAllByRole('button', { name: '付箋を貼る' })[0])
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'M1' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    await waitFor(() => expect(screen.getByText('M1')).toBeTruthy())

    // 保存済みの付箋をその場で編集開始(まだ保存していない下書き)
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '下書き中の内容' } })

    // ログイン状態が更新され、付箋の再取得が走る(サーバー側は今回作成した内容を返す)
    fetchBookmarksByArticleMock.mockResolvedValueOnce(new Map([[GENRE_ORDER[0], { id: 'bookmark-1', memo: 'M1' }]]))
    authChangeCallback()
    await waitFor(() => expect(fetchBookmarksByArticleMock).toHaveBeenCalledTimes(2))

    // 再取得後も付箋のidが変わらないため、パネルが作り直されず、編集中の下書きが残っている
    expect(screen.getByRole<HTMLTextAreaElement>('textbox').value).toBe('下書き中の内容')
  })

  it('付箋を削除すると、再取得を待たずに「付箋を貼る」の表示に戻ること', async () => {
    getSessionMock.mockResolvedValue(makeSession('reader@example.com'))
    fetchBookmarksByArticleMock.mockResolvedValue(new Map([[GENRE_ORDER[0], { id: 'bookmark-1', memo: '削除するメモ' }]]))
    const { deleteBookmark } = await import('../../../app/research-digest/lib/bookmarks')
    vi.mocked(deleteBookmark).mockResolvedValue(true)

    render(<ArticleDetailView article={article} />)
    await waitFor(() => expect(screen.getByText('削除するメモ')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: '削除' }))

    await waitFor(() => expect(screen.queryByText('削除するメモ')).toBeNull())
    expect(screen.getAllByRole('button', { name: '付箋を貼る' })).toHaveLength(2)
  })
})
