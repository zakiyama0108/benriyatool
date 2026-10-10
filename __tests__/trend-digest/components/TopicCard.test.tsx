import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TopicCard from '../../../app/trend-digest/components/TopicCard'
import { DURATION_LABELS, HEAT_LABELS } from '../../../app/trend-digest/lib/types'
import type { Topic, TopicTrend } from '../../../app/trend-digest/lib/types'

// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるが、本テストはisAdminによる
// フィードバック欄の表示切り替えのみを検証するためモックする(ai-dev-digestと同じ考え方)
vi.mock('../../../app/trend-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

const topic: Topic = {
  id: 'topic-1',
  genre: 'music',
  heading: '新曲がストリーミングで急上昇',
  body: 'あるアーティストの新曲がストリーミングサービスの週間ランキングで急上昇した。',
  sourceTitle: 'サンプル楽曲A',
  sourceName: 'Oricon',
  sourceUrl: 'https://example.com/oricon/a',
}

function makeTrend(overrides: Partial<TopicTrend> = {}): TopicTrend {
  return {
    durationLabel: 'talked',
    heatLabel: 'high',
    continuationDays: 30,
    continuationStartDate: '2026-08-16',
    reportCount: 2,
    originRegion: '日本',
    currentRegions: ['日本'],
    ...overrides,
  }
}

// 仕様: specs/trend-digest/article-detail/requirements.md#運営者向けフィードバック-5、specs/trend-digest/article-detail/requirements.md#運営者向けフィードバック-6
describe('トピックカードのフィードバック入力欄表示切り替え - isAdminがtrueの場合のみ配下にフィードバック入力欄を表示する', () => {
  it('isAdminがtrueの場合、フィードバック入力欄(テキストエリア)が表示されること', () => {
    render(<TopicCard topic={topic} isAdmin={true} articleId="2026-09-15-entertainment" />)
    expect(screen.getByRole('textbox')).toBeTruthy()
  })

  it('isAdminがfalseの場合、フィードバック入力欄が表示されないこと', () => {
    render(<TopicCard topic={topic} isAdmin={false} articleId="2026-09-15-entertainment" />)
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

// 仕様: specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-10、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-12、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-13、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-18
describe('トピックカードの継続度・注目度バッジ表示 - topic.trendがある場合のみ、継続度ラベルと注目度ラベルの両方のバッジを表示する', () => {
  it('trendがある場合、継続度ラベル・注目度ラベルの日本語表記が両方表示されること', () => {
    render(<TopicCard topic={{ ...topic, trend: makeTrend() }} isAdmin={false} articleId="a" />)
    expect(screen.getByText(DURATION_LABELS.talked, { exact: false })).toBeTruthy()
    expect(screen.getByText(HEAT_LABELS.high)).toBeTruthy()
  })

  it('trendがある場合、英語の識別子(durationLabel・heatLabelの値そのもの)が画面に出ないこと', () => {
    render(<TopicCard topic={{ ...topic, trend: makeTrend() }} isAdmin={false} articleId="a" />)
    expect(screen.queryByText('talked')).toBeNull()
    expect(screen.queryByText('high')).toBeNull()
  })

  it('trendがない場合、継続度・注目度のバッジもトレンド情報の行も表示されないこと', () => {
    render(<TopicCard topic={topic} isAdmin={false} articleId="a" />)
    for (const label of Object.values(DURATION_LABELS)) {
      expect(screen.queryByText(label, { exact: false })).toBeNull()
    }
    for (const label of Object.values(HEAT_LABELS)) {
      expect(screen.queryByText(label)).toBeNull()
    }
  })

  it('継続度ラベルのバッジと注目度ラベルのバッジで異なるスタイルの系統(class)が当たること(requirements.md#継続度・注目度の表示の扱い-8)', () => {
    render(<TopicCard topic={{ ...topic, trend: makeTrend() }} isAdmin={false} articleId="a" />)
    const durationBadge = screen.getByText(DURATION_LABELS.talked, { exact: false })
    const heatBadge = screen.getByText(HEAT_LABELS.high)
    expect(durationBadge.className).not.toBe(heatBadge.className)
  })
})
