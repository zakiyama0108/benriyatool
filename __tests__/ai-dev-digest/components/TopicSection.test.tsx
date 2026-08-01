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
    sections: [
      { heading: '何が発表されたか', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
      { heading: '開発者への影響', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
    ],
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

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-1、specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-2、specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-5、specs/ai-dev-digest/article-detail/requirements.md#表示分量・著作権配慮-2、specs/ai-dev-digest/content-generation/requirements.md#記事の構成-7、specs/ai-dev-digest/content-generation/requirements.md#著作権への配慮(根拠)-4、specs/ai-dev-digest/content-generation/requirements.md#著作権への配慮(根拠)-5
describe('トピック表示 - 見出し・要約・出典(発信者名・元URLへのリンク)・情報源種別バッジをセットで表示する', () => {
  it('見出し・発信者名・出典URLへのリンクが表示されること', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" />)
    expect(screen.getByText('Anthropicが新モデルを発表')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Anthropic' })
    expect(link.href).toBe('https://www.anthropic.com/news/example')
    expect(link.target).toBe('_blank')
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-3、specs/ai-dev-digest/content-generation/requirements.md#要約-3
describe('トピック表示 - 要約の各セクション(小見出し+導入文)を配列順にすべて常時表示する', () => {
  it('全セクションの見出しと導入文(teaser)がそれぞれ常時表示されること', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" />)
    expect(screen.getByText('何が発表されたか')).toBeTruthy()
    expect(screen.getByText('あ'.repeat(60))).toBeTruthy()
    expect(screen.getByText('開発者への影響')).toBeTruthy()
    expect(screen.getByText('い'.repeat(60))).toBeTruthy()
  })

  it('セクション見出しがh3相当の見出しレベルで表示されること', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" />)
    expect(screen.getByRole('heading', { level: 3, name: '何が発表されたか' })).toBeTruthy()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-4、specs/ai-dev-digest/content-generation/requirements.md#要約-2
describe('トピック表示 - 各セクションの詳細文(detail)はHTML標準の<details>要素で展開表示する', () => {
  it('各セクションの<details>要素が初期状態で閉じており、詳細文(detail)を含んでいること', () => {
    const { container } = render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" />)
    const detailsElements = container.querySelectorAll('details')
    expect(detailsElements.length).toBe(2)
    detailsElements.forEach((details) => {
      expect(details.open).toBe(false)
    })
    expect(container.textContent).toContain('あ'.repeat(500))
    expect(container.textContent).toContain('い'.repeat(500))
  })

  it('<summary>のテキストが「詳細を見る」であること', () => {
    const { container } = render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" />)
    const summaries = container.querySelectorAll('summary')
    expect(summaries.length).toBe(2)
    summaries.forEach((summary) => {
      expect(summary.textContent).toBe('詳細を見る')
    })
  })
})

// 仕様: specs/ai-dev-digest/article-detail/design.md#その日の記事本文を表示する処理
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

// 仕様: specs/ai-dev-digest/article-detail/design.md#その日の記事本文を表示する処理
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

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#運営者向けフィードバック-7、specs/ai-dev-digest/article-detail/requirements.md#フィードバックの保存・権限-4
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
