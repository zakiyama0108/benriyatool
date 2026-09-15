import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import GenreSection from '../../../app/trend-digest/components/GenreSection'
import { GENRE_ORDER, GENRE_LABELS } from '../../../app/trend-digest/lib/types'
import type { Topic } from '../../../app/trend-digest/lib/types'

// TopicCard経由でFeedbackForm(→saveFeedback→supabaseClient)が読み込まれるが、本テストは
// ジャンル見出し・トピック本文の表示のみを検証するためモックする(ai-dev-digestと同じ考え方)
vi.mock('../../../app/trend-digest/lib/saveFeedback', () => ({ saveFeedback: vi.fn() }))

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: 'topic-1',
    genre: 'music',
    heading: '新曲がストリーミングで急上昇',
    body: 'あるアーティストの新曲がストリーミングサービスの週間ランキングで急上昇した。',
    sourceTitle: 'サンプル楽曲A',
    sourceName: 'Oricon',
    sourceUrl: 'https://example.com/oricon/a',
    ...overrides,
  }
}

// 仕様: specs/trend-digest/article-detail/requirements.md#記事本文表示-2、specs/trend-digest/article-detail/requirements.md#記事本文表示-3、specs/trend-digest/article-detail/requirements.md#表示分量・著作権配慮-2
describe('ジャンル見出し+トピックカードの表示 - 動きがあったジャンルだけを見出しとして、配下にトピックカードを表示する', () => {
  it('該当ジャンルのトピックが1件もない場合、見出し自体が表示されないこと(動きがなかったジャンル)', () => {
    const { container } = render(
      <GenreSection genre="music" topics={[]} isAdmin={false} articleId="2026-09-15-entertainment" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('ジャンル見出しの文言がGENRE_LABELSの日本語ラベル(例: musicなら「音楽」)と一致すること', () => {
    render(
      <GenreSection
        genre="music"
        topics={[makeTopic()]}
        isAdmin={false}
        articleId="2026-09-15-entertainment"
      />
    )
    expect(screen.getByRole('heading', { name: GENRE_LABELS.music })).toBeTruthy()
  })

  it('複数ジャンルをGENRE_ORDERの順にマウントした場合、見出しがその順でDOMに現れること(表示順が仕様の定義順と一致することの確認)', () => {
    const [first, second, third] = GENRE_ORDER.entertainment
    render(
      <>
        <GenreSection genre={first} topics={[makeTopic({ genre: first })]} isAdmin={false} articleId="a" />
        <GenreSection genre={second} topics={[]} isAdmin={false} articleId="a" />
        <GenreSection genre={third} topics={[makeTopic({ genre: third })]} isAdmin={false} articleId="a" />
      </>
    )
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    // secondは動きがなかった扱い(topics: [])のため見出しに現れず、first→thirdの順のみ現れる
    expect(headings).toEqual([GENRE_LABELS[first], GENRE_LABELS[third]])
  })

  it('各トピックの見出し・本文・出典(情報源名・元URLへのリンク、新規タブで開く)が表示されること', () => {
    render(
      <GenreSection
        genre="music"
        topics={[makeTopic()]}
        isAdmin={false}
        articleId="2026-09-15-entertainment"
      />
    )
    expect(screen.getByText('新曲がストリーミングで急上昇')).toBeTruthy()
    expect(screen.getByText('あるアーティストの新曲がストリーミングサービスの週間ランキングで急上昇した。')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'Oricon' })
    expect(link.href).toBe('https://example.com/oricon/a')
    expect(link.target).toBe('_blank')
  })
})
