import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import PredictionCard from '../../../app/future-digest/components/PredictionCard'
import type { Slot } from '../../../app/future-digest/lib/sortSlots'
import type { Prediction, EmptySlot } from '../../../app/future-digest/lib/types'
import { GENRE_ORDER } from '../../../app/future-digest/lib/types'

// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるが、本テストはisAdminによる
// フィードバック欄の表示切り替え・掲載できなかった枠の文言のみを検証するためモックする
vi.mock('../../../app/future-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

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

// 仕様: specs/future-digest/article-detail/requirements.md#記事本文の表示-2
describe('PredictionCard - 予測がある枠の表示', () => {
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
describe('PredictionCard - 掲載できなかった枠の表示(候補なし・収集失敗・生成失敗を異なる文言で区別する)', () => {
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
