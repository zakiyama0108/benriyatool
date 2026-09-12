import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import TopicSection from '../../../app/news-digest/components/TopicSection'
import type { Topic } from '../../../app/news-digest/lib/types'

// FeedbackForm経由でsaveFeedback(→supabaseClient)が読み込まれるが、本テストは表示切り替えのみを
// 検証するため、実際のSupabase接続情報を必要としないようモックする
vi.mock('../../../app/news-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
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
    sourcePublishedAt: '2026-09-08T01:00:00Z',
    belowCriteria: false,
    ...overrides,
  }
}

// テスト対象外の描画確認(見出し・出典等)ではisAdmin/articleDateの値は結果に影響しないため、
// 常に固定値を渡す既定値としてまとめる
const noop = { articleDate: '2026-09-09', isAdmin: false } as const

// 仕様: specs/news-digest/article-detail/requirements.md#記事本文表示-2、specs/news-digest/article-detail/requirements.md#表示分量・著作権配慮-2
describe('トピック表示 - 見出し・出典(発信者名・元URLへのリンク)をセットで表示する', () => {
  it('見出し・発信者名・出典URLへのリンクが新規タブで開く形で表示されること', () => {
    render(<TopicSection topic={makeTopic()} {...noop} />)
    expect(screen.getByText('保育料の一部が来年度から無償化される')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'こども家庭庁' })
    expect(link.href).toBe('https://www.cfa.go.jp/news/example')
    expect(link.target).toBe('_blank')
  })
})

// 仕様: specs/news-digest/article-detail/design.md#その週の記事本文を表示する処理
describe('トピック表示 - 出典元(元記事)の投稿日時をJSTの日付表示で併記する', () => {
  it('sourcePublishedAtがある場合、「YYYY年M月D日投稿」の形式で併記されること', () => {
    render(<TopicSection topic={makeTopic({ sourcePublishedAt: '2026-09-08T01:00:00Z' })} {...noop} />)
    expect(screen.getByText(/2026年9月8日投稿/)).toBeTruthy()
  })

  it('sourcePublishedAtが無い(任意項目)場合、投稿日時の表示を省略すること', () => {
    render(<TopicSection topic={makeTopic({ sourcePublishedAt: undefined })} {...noop} />)
    expect(screen.queryByText(/投稿/)).toBeNull()
  })
})

// 仕様: specs/news-digest/article-detail/requirements.md#記事本文表示-5
describe('トピック表示 - カテゴリバッジを表示する', () => {
  it('categoryに応じた日本語ラベルのバッジが表示されること', () => {
    render(<TopicSection topic={makeTopic({ category: 'business' })} {...noop} />)
    expect(screen.getByText('経済・ビジネス')).toBeTruthy()
  })
})

// 仕様: specs/news-digest/article-detail/requirements.md#記事本文表示-7
describe('トピック表示 - 重要度(★1〜★5)を見出しの近くに表示する', () => {
  it('ImportanceStars(重要度表示)が表示されること', () => {
    render(<TopicSection topic={makeTopic({ importance: 5 })} {...noop} />)
    expect(screen.getByLabelText('重要度5')).toBeTruthy()
  })
})

// 仕様: specs/news-digest/article-detail/requirements.md#記事本文表示-3
describe('トピック表示 - 固定4観点(何が起きたか→なぜ重要か→背景→今後の見通し)の見出しと導入文をこの順序で常時表示する', () => {
  it('4観点の見出し・導入文がこの順序で常時表示されること', () => {
    const { container } = render(<TopicSection topic={makeTopic()} {...noop} />)
    const headings = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent)
    expect(headings).toEqual(['何が起きたか', 'なぜ重要か', '背景', '今後の見通し'])
    expect(screen.getByText('あ'.repeat(60))).toBeTruthy()
    expect(screen.getByText('い'.repeat(60))).toBeTruthy()
    expect(screen.getByText('う'.repeat(60))).toBeTruthy()
    expect(screen.getByText('え'.repeat(60))).toBeTruthy()
  })
})

// 仕様: specs/news-digest/article-detail/requirements.md#記事本文表示-4
describe('トピック表示 - 各観点の詳細文はHTML標準の<details>要素で展開表示する', () => {
  it('4観点分の<details>要素が初期状態で閉じており、各観点の詳細文を含んでいること', () => {
    const { container } = render(<TopicSection topic={makeTopic()} {...noop} />)
    const detailsElements = container.querySelectorAll('details')
    expect(detailsElements.length).toBe(4)
    detailsElements.forEach((details) => {
      expect(details.open).toBe(false)
    })
    expect(container.textContent).toContain('あ'.repeat(250))
    expect(container.textContent).toContain('え'.repeat(250))
  })

  it('<summary>のテキストが「詳細を見る」であること', () => {
    const { container } = render(<TopicSection topic={makeTopic()} {...noop} />)
    const summaries = container.querySelectorAll('summary')
    expect(summaries.length).toBe(4)
    summaries.forEach((summary) => {
      expect(summary.textContent).toBe('詳細を見る')
    })
  })
})

// 仕様: specs/news-digest/article-detail/requirements.md#記事本文表示-6
describe('トピック表示 - belowCriteriaがtrueの場合のみ「専用枠(基準未達)」バッジと理由を表示する', () => {
  it('belowCriteriaがtrueのとき、「専用枠(基準未達)」バッジとbelowCriteriaReasonの内容が表示されること', () => {
    render(
      <TopicSection
        topic={makeTopic({ belowCriteria: true, belowCriteriaReason: '裏付けメディアが1社のみ' })}
        {...noop}
      />
    )
    expect(screen.getByText('専用枠(基準未達)')).toBeTruthy()
    expect(screen.getByText('裏付けメディアが1社のみ')).toBeTruthy()
  })

  it('belowCriteriaがfalseのとき、「専用枠(基準未達)」バッジは表示されないこと', () => {
    render(<TopicSection topic={makeTopic({ belowCriteria: false })} {...noop} />)
    expect(screen.queryByText('専用枠(基準未達)')).toBeNull()
  })
})

// 仕様: specs/news-digest/article-detail/requirements.md#運営者向けフィードバック-9、specs/news-digest/article-detail/requirements.md#フィードバックの保存・権限-4
describe('フィードバック入力欄の表示切り替え - 運営者本人(isAdmin)の場合のみ表示する', () => {
  it('isAdminがtrueの場合、フィードバック入力欄(テキストエリア)が表示されること', () => {
    render(<TopicSection topic={makeTopic()} articleDate="2026-09-09" isAdmin />)
    expect(screen.getByRole('textbox')).toBeTruthy()
  })

  it('isAdminがfalseの場合、フィードバック入力欄は表示されないこと', () => {
    render(<TopicSection topic={makeTopic()} articleDate="2026-09-09" isAdmin={false} />)
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})
