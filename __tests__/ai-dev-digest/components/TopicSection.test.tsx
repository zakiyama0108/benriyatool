import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import TopicSection from '../../../app/ai-dev-digest/components/TopicSection'
import type { Topic } from '../../../app/ai-dev-digest/lib/types'
import { isAuthorizedAdmin } from '../../../app/lib/adminAuth'

vi.mock('../../../app/lib/adminAuth', () => ({ isAuthorizedAdmin: vi.fn() }))
// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるが、本テストは表示切り替えのみを
// 検証するため、実際のSupabase接続情報を必要としないようモックする
vi.mock('../../../app/ai-dev-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'topic-1',
    heading: 'Anthropicが新モデルを発表',
    summary: 'あ'.repeat(100),
    sourceType: 'official',
    sourceName: 'Anthropic',
    sourceUrl: 'https://www.anthropic.com/news/example',
    belowCriteria: false,
    ...overrides,
  }
}

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-1、specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-2、specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-3、specs/ai-dev-digest/content-generation/requirements.md#記事の構成-4、specs/ai-dev-digest/content-generation/requirements.md#著作権への配慮(根拠)-3
describe('トピック表示 - 見出し・要約・出典(発信者名・元URLへのリンク)・情報源種別バッジをセットで表示する', () => {
  it('見出し・要約・発信者名・出典URLへのリンクが表示されること', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" />)
    expect(screen.getByText('Anthropicが新モデルを発表')).toBeTruthy()
    expect(screen.getByText('あ'.repeat(100))).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Anthropic' }) as HTMLAnchorElement
    expect(link.href).toBe('https://www.anthropic.com/news/example')
    expect(link.target).toBe('_blank')
  })
})

// 仕様: specs/ai-dev-digest/article-detail/design.md「その日の記事本文を表示する処理」
describe('トピック表示 - youtubeVideoIdを持つ場合のみYouTube埋め込みプレーヤーを表示する', () => {
  it('youtubeVideoIdがある場合、YouTube埋め込みプレーヤー(iframe)が描画されること', () => {
    const { container } = render(
      <TopicSection topic={makeTopic({ youtubeVideoId: 'dQw4w9WgXcQ' })} session={null} articleDate="2026-08-01" />
    )
    expect(container.querySelector('iframe')).not.toBeNull()
  })

  it('youtubeVideoIdがない場合、YouTube埋め込みプレーヤーは描画されないこと', () => {
    const { container } = render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" />)
    expect(container.querySelector('iframe')).toBeNull()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/design.md「その日の記事本文を表示する処理」
describe('トピック表示 - belowCriteriaがtrueの場合のみ「採用基準未達」バッジと理由を表示する', () => {
  it('belowCriteriaがtrueのとき、「採用基準未達」バッジとbelowCriteriaReasonの内容が表示されること', () => {
    render(
      <TopicSection
        topic={makeTopic({ belowCriteria: true, belowCriteriaReason: 'いいね数18件(基準30件に12件不足)' })}
        session={null}
        articleDate="2026-08-01"
      />
    )
    expect(screen.getByText('採用基準未達')).toBeTruthy()
    expect(screen.getByText('いいね数18件(基準30件に12件不足)')).toBeTruthy()
  })

  it('belowCriteriaがfalseのとき、「採用基準未達」バッジは表示されないこと', () => {
    render(<TopicSection topic={makeTopic({ belowCriteria: false })} session={null} articleDate="2026-08-01" />)
    expect(screen.queryByText('採用基準未達')).toBeNull()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#運営者向けフィードバック-5
describe('フィードバック入力欄の表示切り替え - ログイン中(セッションあり)の場合のみ表示する', () => {
  it('セッションがある場合、フィードバック入力欄(テキストエリア)が表示されること', () => {
    render(<TopicSection topic={makeTopic()} session={makeSession('admin@example.com')} articleDate="2026-08-01" />)
    expect(screen.getByRole('textbox')).toBeTruthy()
  })

  it('セッションがnull(未ログイン)の場合、フィードバック入力欄は表示されないこと', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" />)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('DBの読み取り(SELECT)を伴うisAuthorizedAdminは呼び出されず、生のログイン状態のみで表示を切り替えること', () => {
    render(<TopicSection topic={makeTopic()} session={makeSession('admin@example.com')} articleDate="2026-08-01" />)
    expect(isAuthorizedAdmin).not.toHaveBeenCalled()
  })
})
