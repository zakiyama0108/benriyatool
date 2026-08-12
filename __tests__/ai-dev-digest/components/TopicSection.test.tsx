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
// BookmarkPanel経由でbookmarks.ts(→supabaseClient)が読み込まれるが、本テストは表示切り替えのみを
// 検証するため、実際のSupabase接続情報を必要としないようモックする(仕様: bookmark/design.md)
vi.mock('../../../app/ai-dev-digest/lib/bookmarks', () => ({
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  deleteBookmark: vi.fn(),
}))

type LegacyOverrides = Partial<Extract<Topic, { sections: unknown }>>
type CurrentOverrides = Partial<Extract<Topic, { summary: unknown }>>

// LegacyTopic(2026-08以前生成、sections形式)のfixture
function makeTopic(overrides: LegacyOverrides = {}): Topic {
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
    sourcePublishedAt: '2026-07-31T10:00:00Z',
    belowCriteria: false,
    ...overrides,
  }
}

// CurrentTopic(2026-08以降生成、固定4観点summary+importance形式)のfixture
function makeCurrentTopic(overrides: CurrentOverrides = {}): Topic {
  return {
    id: 'topic-1',
    heading: 'Anthropicが新モデルを発表',
    summary: {
      benefit: { heading: '何が発表されたか', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(250) },
      whatsNew: { heading: '新規性', teaser: 'い'.repeat(60), detail: 'い'.repeat(250) },
      how: { heading: '仕組み', teaser: 'う'.repeat(60), detail: 'う'.repeat(250) },
      howToUse: { heading: '開発者への影響', teaser: 'え'.repeat(60), detail: 'え'.repeat(250) },
    },
    importance: 4,
    sourceType: 'official',
    sourceName: 'Anthropic',
    sourceUrl: 'https://www.anthropic.com/news/example',
    sourcePublishedAt: '2026-07-31T10:00:00Z',
    belowCriteria: false,
    ...overrides,
  }
}

function makeSession(email: string): Session {
  return { user: { email } } as Session
}

// テスト対象外の描画確認(見出し・出典等)ではisAdmin/bookmarkの値は結果に影響しないため、
// 常にfalse/nullを渡す既定値としてまとめる
const noop = { isAdmin: false, bookmark: null } as const

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-1、specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-2、specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-5、specs/ai-dev-digest/article-detail/requirements.md#表示分量・著作権配慮-2、specs/ai-dev-digest/content-generation/requirements.md#記事の構成-7、specs/ai-dev-digest/content-generation/requirements.md#著作権への配慮(根拠)-4、specs/ai-dev-digest/content-generation/requirements.md#著作権への配慮(根拠)-5
describe('トピック表示 - 見出し・要約・出典(発信者名・元URLへのリンク)・情報源種別バッジをセットで表示する', () => {
  it('見出し・発信者名・出典URLへのリンクが表示されること', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" {...noop} />)
    expect(screen.getByText('Anthropicが新モデルを発表')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Anthropic' })
    expect(link.href).toBe('https://www.anthropic.com/news/example')
    expect(link.target).toBe('_blank')
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-11、specs/ai-dev-digest/article-detail/design.md「その日の記事本文を表示する処理」
describe('トピック表示 - 出典元(元記事・元動画)の投稿日時をJSTの日付表示で表示する', () => {
  it('sourcePublishedAt(UTC)がJSTの「YYYY年M月D日」形式に変換されて表示されること', () => {
    render(
      <TopicSection
        topic={makeTopic({ sourcePublishedAt: '2026-07-30T20:30:00Z' })}
        session={null}
        articleDate="2026-08-01"
        {...noop}
      />
    )
    expect(screen.getByText(/2026年7月31日投稿/)).toBeTruthy()
  })

  it('sourcePublishedAtが無い(本フィールド導入前の既存記事データ)場合、投稿日時の表示を省略すること', () => {
    render(
      <TopicSection topic={makeTopic({ sourcePublishedAt: undefined })} session={null} articleDate="2026-08-01" {...noop} />
    )
    expect(screen.queryByText(/投稿/)).toBeNull()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-3、specs/ai-dev-digest/content-generation/requirements.md#要約-3
describe('トピック表示 - 要約の各セクション(小見出し+導入文)を配列順にすべて常時表示する', () => {
  it('全セクションの見出しと導入文(teaser)がそれぞれ常時表示されること', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" {...noop} />)
    expect(screen.getByText('何が発表されたか')).toBeTruthy()
    expect(screen.getByText('あ'.repeat(60))).toBeTruthy()
    expect(screen.getByText('開発者への影響')).toBeTruthy()
    expect(screen.getByText('い'.repeat(60))).toBeTruthy()
  })

  it('セクション見出しがh3相当の見出しレベルで表示されること', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" {...noop} />)
    expect(screen.getByRole('heading', { level: 3, name: '何が発表されたか' })).toBeTruthy()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-2、specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-3、specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-12、specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-13、specs/ai-dev-digest/article-detail/design.md#その日の記事本文を表示する処理
describe('トピック表示(新形式CurrentTopic) - 固定4観点をbenefit→whatsNew→how→howToUseの順に常時表示し、重要度を表示する', () => {
  it('4観点の見出し・導入文がこの順序で常時表示されること', () => {
    const { container } = render(<TopicSection topic={makeCurrentTopic()} session={null} articleDate="2026-08-01" {...noop} />)
    const headings = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent)
    expect(headings).toEqual(['何が発表されたか', '新規性', '仕組み', '開発者への影響'])
  })

  it('ImportanceStars(重要度表示)が表示されること', () => {
    render(<TopicSection topic={makeCurrentTopic({ importance: 5 })} session={null} articleDate="2026-08-01" {...noop} />)
    expect(screen.getByLabelText('重要度5')).toBeTruthy()
  })

  it('LegacyTopic(sections形式)の場合、ImportanceStarsは表示されないこと', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" {...noop} />)
    expect(screen.queryByLabelText(/重要度/)).toBeNull()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-4、specs/ai-dev-digest/content-generation/requirements.md#要約-2
describe('トピック表示 - 各セクションの詳細文(detail)はHTML標準の<details>要素で展開表示する', () => {
  it('各セクションの<details>要素が初期状態で閉じており、詳細文(detail)を含んでいること', () => {
    const { container } = render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" {...noop} />)
    const detailsElements = container.querySelectorAll('details')
    expect(detailsElements.length).toBe(2)
    detailsElements.forEach((details) => {
      expect(details.open).toBe(false)
    })
    expect(container.textContent).toContain('あ'.repeat(500))
    expect(container.textContent).toContain('い'.repeat(500))
  })

  it('<summary>のテキストが「詳細を見る」であること', () => {
    const { container } = render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" {...noop} />)
    const summaries = container.querySelectorAll('summary')
    expect(summaries.length).toBe(2)
    summaries.forEach((summary) => {
      expect(summary.textContent).toBe('詳細を見る')
    })
  })

  it('CurrentTopic(固定4観点)の場合、4観点分の<details>要素が初期状態で閉じており、各観点の詳細文を含んでいること', () => {
    const { container } = render(<TopicSection topic={makeCurrentTopic()} session={null} articleDate="2026-08-01" {...noop} />)
    const detailsElements = container.querySelectorAll('details')
    expect(detailsElements.length).toBe(4)
    detailsElements.forEach((details) => {
      expect(details.open).toBe(false)
    })
    expect(container.textContent).toContain('あ'.repeat(250))
    expect(container.textContent).toContain('え'.repeat(250))
  })
})

// 仕様: specs/ai-dev-digest/article-detail/design.md#その日の記事本文を表示する処理
describe('トピック表示 - youtubeVideoIdを持つ場合のみYouTube埋め込みプレーヤーを表示する', () => {
  it('youtubeVideoIdがある場合、YouTube埋め込みプレーヤー(iframe)が描画されること', () => {
    const { container } = render(
      <TopicSection topic={makeTopic({ youtubeVideoId: 'dQw4w9WgXcQ' })} session={null} articleDate="2026-08-01" {...noop} />
    )
    expect(container.querySelector('iframe')).not.toBeNull()
  })

  it('youtubeVideoIdがない場合、YouTube埋め込みプレーヤーは描画されないこと', () => {
    const { container } = render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" {...noop} />)
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
        {...noop}
      />
    )
    expect(screen.getByText('採用基準未達')).toBeTruthy()
    expect(screen.getByText('いいね数18件(基準30件に12件不足)')).toBeTruthy()
  })

  it('belowCriteriaがfalseのとき、「採用基準未達」バッジは表示されないこと', () => {
    render(<TopicSection topic={makeTopic({ belowCriteria: false })} session={null} articleDate="2026-08-01" {...noop} />)
    expect(screen.queryByText('採用基準未達')).toBeNull()
  })
})

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#運営者向けフィードバック-7、specs/ai-dev-digest/article-detail/requirements.md#フィードバックの保存・権限-4
describe('フィードバック入力欄の表示切り替え - 運営者本人(isAdmin)の場合のみ表示する(2026-08修正)', () => {
  it('isAdminがtrueの場合、フィードバック入力欄(テキストエリア)が表示されること', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" isAdmin bookmark={null} />)
    expect(screen.getByRole('textbox')).toBeTruthy()
  })

  it('isAdminがfalseの場合、セッションの有無に関わらずフィードバック入力欄は表示されないこと', () => {
    render(
      <TopicSection
        topic={makeTopic()}
        session={makeSession('reader@example.com')}
        articleDate="2026-08-01"
        isAdmin={false}
        bookmark={null}
      />
    )
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('TopicSection自体はDBの読み取り(SELECT)を伴うisAuthorizedAdminを呼び出さないこと(運営者判定の呼び出しはArticleDetailView側の責務)', () => {
    render(
      <TopicSection
        topic={makeTopic()}
        session={makeSession('reader@example.com')}
        articleDate="2026-08-01"
        isAdmin={false}
        bookmark={null}
      />
    )
    expect(isAuthorizedAdmin).not.toHaveBeenCalled()
  })
})

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#トピックへの付箋-1、specs/ai-dev-digest/bookmark/requirements.md#トピックへの付箋-5、specs/ai-dev-digest/bookmark/requirements.md#表示範囲・権限-2
describe('付箋操作の表示切り替え - ログイン中(セッションあり)の場合のみBookmarkPanelを表示する', () => {
  it('セッションがある場合、BookmarkPanel(未付箋なら「付箋を貼る」操作)が表示されること', () => {
    render(
      <TopicSection
        topic={makeTopic()}
        session={makeSession('reader@example.com')}
        articleDate="2026-08-01"
        isAdmin={false}
        bookmark={null}
      />
    )
    expect(screen.getByRole('button', { name: '付箋を貼る' })).toBeTruthy()
  })

  it('セッションがnull(未ログイン)の場合、付箋を貼る操作自体が表示されないこと', () => {
    render(<TopicSection topic={makeTopic()} session={null} articleDate="2026-08-01" isAdmin={false} bookmark={null} />)
    expect(screen.queryByRole('button', { name: '付箋を貼る' })).toBeNull()
  })

  it('bookmarkの内容がBookmarkPanelのinitialBookmarkにそのまま渡り、保存済みメモが表示されること', () => {
    render(
      <TopicSection
        topic={makeTopic()}
        session={makeSession('reader@example.com')}
        articleDate="2026-08-01"
        isAdmin={false}
        bookmark={{ id: 'bookmark-1', memo: '気になるので後で読む' }}
      />
    )
    expect(screen.getByText('気になるので後で読む')).toBeTruthy()
  })

  it('BookmarkPanelの表示にDBの読み取り(SELECT)を伴うisAuthorizedAdminは使わないこと(付箋機能は運営者判定を利用しない)', () => {
    render(
      <TopicSection
        topic={makeTopic()}
        session={makeSession('reader@example.com')}
        articleDate="2026-08-01"
        isAdmin={false}
        bookmark={null}
      />
    )
    expect(isAuthorizedAdmin).not.toHaveBeenCalled()
  })
})
