import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TopicCard from '../../../app/trend-digest/components/TopicCard'
import type { Topic } from '../../../app/trend-digest/lib/types'

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
