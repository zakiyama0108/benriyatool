import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import PredictionCard from '../../../app/future-digest/components/PredictionCard'
import type { Slot } from '../../../app/future-digest/lib/sortSlots'
import type { Prediction, EmptySlot } from '../../../app/future-digest/lib/types'
import { GENRE_ORDER } from '../../../app/future-digest/lib/types'
import { createBookmark } from '../../../app/future-digest/lib/bookmarks'

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるが、本テストはisAdminによる
// フィードバック欄の表示切り替え・掲載できなかった枠の文言のみを検証するためモックする
vi.mock('../../../app/future-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))
// BookmarkPanel経由でlib/bookmarks(→supabaseClient)が読み込まれるが、本テストは付箋操作領域の
// 表示切り替えのみを検証するためモックする(BookmarkPanel.test.tsxで保存・削除の挙動は担保済み)
vi.mock('../../../app/future-digest/lib/bookmarks', () => ({
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: `${GENRE_ORDER[0]}--near`,
    genre: GENRE_ORDER[0],
    horizon: 'near',
    heading: '自律走行がさらに普及する',
    body: 'あ'.repeat(250),
    impact: 'high',
    impactReason: '生活の移動手段が大きく変わるため',
    targetPeriod: '2030年まで',
    sourceTitle: '交通白書2026',
    sourceName: '国土交通省',
    sourceUrl: 'https://example.com/report',
    ...overrides,
  }
}

function makeEmptySlot(overrides: Partial<EmptySlot> = {}): EmptySlot {
  return { genre: GENRE_ORDER[0], horizon: 'near', reason: 'no-candidate', ...overrides }
}

const createBookmarkMock = vi.mocked(createBookmark)

// 仕様: specs/future-digest/article-detail/requirements.md#記事本文の表示-2
describe('予測がある枠の表示', () => {
  it('見出し・本文・影響度の根拠・対象時期・出典リンク(新規タブ)が表示されること', () => {
    const prediction = makePrediction()
    const slot: Slot = { genre: prediction.genre, horizon: prediction.horizon, kind: 'prediction', prediction }
    render(<PredictionCard slot={slot} articleId="2026-09-24" isAdmin={false} />)

    expect(screen.getByText(prediction.heading)).toBeTruthy()
    expect(screen.getByText(prediction.body)).toBeTruthy()
    expect(screen.getByText(`影響度の根拠: ${prediction.impactReason}`)).toBeTruthy()
    expect(screen.getByText(prediction.targetPeriod)).toBeTruthy()

    const link = screen.getByRole('link')
    expect(link.href).toBe(prediction.sourceUrl)
    expect(link.target).toBe('_blank')
    expect(link.rel).toContain('noopener')
    expect(link.rel).toContain('noreferrer')
  })

  it('isAdminがtrueの場合、フィードバック入力欄が表示されること', () => {
    const prediction = makePrediction()
    const slot: Slot = { genre: prediction.genre, horizon: prediction.horizon, kind: 'prediction', prediction }
    render(<PredictionCard slot={slot} articleId="2026-09-24" isAdmin={true} />)
    expect(screen.getByRole('textbox')).toBeTruthy()
  })

  it('isAdminがfalseの場合、フィードバック入力欄が表示されないこと', () => {
    const prediction = makePrediction()
    const slot: Slot = { genre: prediction.genre, horizon: prediction.horizon, kind: 'prediction', prediction }
    render(<PredictionCard slot={slot} articleId="2026-09-24" isAdmin={false} />)
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

// 仕様: specs/future-digest/article-detail/requirements.md#記事本文の表示-3、specs/future-digest/article-detail/requirements.md#記事本文の表示-4、specs/future-digest/article-detail/requirements.md#記事本文の表示-5
describe('掲載できなかった枠の表示(候補なし・収集失敗・生成失敗を異なる文言で区別する)', () => {
  it('no-candidateの枠で「候補が見つかりませんでした」が表示され、本文・フィードバック欄が出ないこと', () => {
    const emptySlot = makeEmptySlot({ reason: 'no-candidate' })
    const slot: Slot = { genre: emptySlot.genre, horizon: emptySlot.horizon, kind: 'empty', emptySlot }
    render(<PredictionCard slot={slot} articleId="2026-09-24" isAdmin={true} />)

    expect(screen.getByText('候補が見つかりませんでした')).toBeTruthy()
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('collection-failedの枠で分類ラベルを含む「今回は記事を収集できませんでした」が表示されること(候補なしと異なる文言)', () => {
    const emptySlot = makeEmptySlot({ reason: 'collection-failed', collectionFailureReason: 'timeout' })
    const slot: Slot = { genre: emptySlot.genre, horizon: emptySlot.horizon, kind: 'empty', emptySlot }
    render(<PredictionCard slot={slot} articleId="2026-09-24" isAdmin={true} />)

    expect(screen.getByText(/今回は記事を収集できませんでした/)).toBeTruthy()
    expect(screen.getByText(/調査が時間内に終わりませんでした/)).toBeTruthy()
    expect(screen.queryByText('候補が見つかりませんでした')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('generation-failedの枠で「今回は記事を用意できませんでした」が表示されること', () => {
    const emptySlot = makeEmptySlot({ reason: 'generation-failed' })
    const slot: Slot = { genre: emptySlot.genre, horizon: emptySlot.horizon, kind: 'empty', emptySlot }
    render(<PredictionCard slot={slot} articleId="2026-09-24" isAdmin={true} />)

    expect(screen.getByText('今回は記事を用意できませんでした')).toBeTruthy()
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

// 仕様: specs/future-digest/bookmark/requirements.md#記事への付箋-5、specs/future-digest/bookmark/design.md「記事詳細ページへの追加(article-detailの画面)」
describe('付箋の操作領域の表示切り替え(ログイン中のみ表示し、掲載できなかった枠には出さない)', () => {
  it('未ログイン(sessionがnull)の場合、予測がある枠でも付箋の操作が表示されないこと', () => {
    const prediction = makePrediction()
    const slot: Slot = { genre: prediction.genre, horizon: prediction.horizon, kind: 'prediction', prediction }
    render(<PredictionCard slot={slot} articleId="2026-09-24" isAdmin={false} session={null} />)
    expect(screen.queryByRole('button', { name: '付箋を貼る' })).toBeNull()
  })

  it('ログイン中(sessionがある)の場合、予測がある枠に付箋の操作(「付箋を貼る」)が表示されること', () => {
    const prediction = makePrediction()
    const slot: Slot = { genre: prediction.genre, horizon: prediction.horizon, kind: 'prediction', prediction }
    render(<PredictionCard slot={slot} articleId="2026-09-24" isAdmin={false} session={makeSession('reader@example.com')} />)
    expect(screen.getByRole('button', { name: '付箋を貼る' })).toBeTruthy()
  })

  it('取得済みの付箋(bookmarkプロパティ)が渡された場合、保存済みのメモが表示されること', () => {
    const prediction = makePrediction()
    const slot: Slot = { genre: prediction.genre, horizon: prediction.horizon, kind: 'prediction', prediction }
    render(
      <PredictionCard
        slot={slot}
        articleId="2026-09-24"
        isAdmin={false}
        session={makeSession('reader@example.com')}
        bookmark={{ id: 'bookmark-1', memo: '気になるメモ' }}
      />
    )
    expect(screen.getByText('気になるメモ')).toBeTruthy()
  })

  it('付箋の取得が遅れて未付箋(null)でマウントされたあとに取得済みの付箋が届いた場合、保存済みのメモが表示され「付箋を貼る」に戻らないこと(bookmark/requirements.md#記事への付箋-4)', () => {
    const prediction = makePrediction()
    const slot: Slot = { genre: prediction.genre, horizon: prediction.horizon, kind: 'prediction', prediction }
    const { rerender } = render(
      <PredictionCard slot={slot} articleId="2026-09-24" isAdmin={false} session={makeSession('reader@example.com')} bookmark={null} />
    )
    expect(screen.getByRole('button', { name: '付箋を貼る' })).toBeTruthy()

    rerender(
      <PredictionCard
        slot={slot}
        articleId="2026-09-24"
        isAdmin={false}
        session={makeSession('reader@example.com')}
        bookmark={{ id: 'bookmark-1', memo: '気になるメモ' }}
      />
    )
    expect(screen.getByText('気になるメモ')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '付箋を貼る' })).toBeNull()
  })

  it('ログイン中でも、候補なし・収集失敗・生成失敗の枠(掲載できなかった枠)には付箋の操作が表示されないこと', () => {
    const emptySlot = makeEmptySlot({ reason: 'no-candidate' })
    const slot: Slot = { genre: emptySlot.genre, horizon: emptySlot.horizon, kind: 'empty', emptySlot }
    render(<PredictionCard slot={slot} articleId="2026-09-24" isAdmin={false} session={makeSession('reader@example.com')} />)
    expect(screen.queryByRole('button', { name: '付箋を貼る' })).toBeNull()
  })
})

// 仕様: specs/future-digest/bookmark/design.md「コンポーネント設計」
describe('付箋変更の親への通知 - BookmarkPanelのonChangeをonBookmarkChangeとして親(ArticleDetailView)へ伝える', () => {
  it('付箋を新規作成すると、onBookmarkChangeが予測IDと作成された付箋で呼ばれること', async () => {
    createBookmarkMock.mockResolvedValue('bookmark-1')
    const onBookmarkChange = vi.fn()
    const prediction = makePrediction()
    const slot: Slot = { genre: prediction.genre, horizon: prediction.horizon, kind: 'prediction', prediction }
    render(
      <PredictionCard
        slot={slot}
        articleId="2026-09-24"
        isAdmin={false}
        session={makeSession('reader@example.com')}
        onBookmarkChange={onBookmarkChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: '付箋を貼る' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '気になるメモ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(onBookmarkChange).toHaveBeenCalledWith(prediction.id, { id: 'bookmark-1', memo: '気になるメモ' }))
  })
})

// 仕様: specs/future-digest/bookmark/design.md「記事詳細ページへの追加(article-detailの画面)」
describe('予測カードへの予測ID属性の付与(付箋一覧からのリンク先になる)', () => {
  it('予測がある枠のカード要素に予測IDのid属性が付くこと(付箋一覧からのリンク先として使う)', () => {
    const prediction = makePrediction()
    const slot: Slot = { genre: prediction.genre, horizon: prediction.horizon, kind: 'prediction', prediction }
    const { container } = render(<PredictionCard slot={slot} articleId="2026-09-24" isAdmin={false} />)
    expect(container.querySelector(`#${prediction.id}`)).toBeTruthy()
  })
})
