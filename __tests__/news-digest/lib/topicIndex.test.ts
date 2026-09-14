import { describe, it, expect } from 'vitest'
import { buildTopicIndex } from '../../../app/news-digest/lib/topicIndex'
import type { Article } from '../../../app/news-digest/lib/types'

function makeArticle(date: string, topics: Article['topics']): Article {
  return { date, topics }
}

function makeTopic(id: string, heading: string): Article['topics'][number] {
  return {
    id,
    heading,
    category: 'general',
    summary: {
      whatHappened: { heading: '何が起きたか', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(250) },
      whyItMatters: { heading: 'なぜ重要か', teaser: 'い'.repeat(60), detail: 'い'.repeat(250) },
      background: { heading: '背景', teaser: 'う'.repeat(60), detail: 'う'.repeat(250) },
      outlook: { heading: '今後の見通し', teaser: 'え'.repeat(60), detail: 'え'.repeat(250) },
    },
    importance: 3,
    sourceName: '発信者',
    sourceUrl: 'https://example.com',
    belowCriteria: false,
  }
}

const articles: Article[] = [
  makeArticle('2026-09-09', [makeTopic('topic-1', '保育料の一部が来年度から無償化される'), makeTopic('topic-2', '県内の交通規制が変更される')]),
  makeArticle('2026-09-02', [makeTopic('topic-1', '別の週の同じIDのトピック')]),
]

// 仕様: specs/news-digest/bookmark/requirements.md#付箋した記事一覧-11
describe('付箋一覧のためのトピック見出しの索引 - 「記事日付:トピックID」からトピック見出しを引き当てる', () => {
  it('各記事・各トピックについて、トピック見出しが引き当てられること', () => {
    const index = buildTopicIndex(articles)
    expect(index['2026-09-09:topic-1']).toBe('保育料の一部が来年度から無償化される')
    expect(index['2026-09-09:topic-2']).toBe('県内の交通規制が変更される')
  })

  it('同じトピックIDでも記事日付が異なれば別々に引き当てられること', () => {
    const index = buildTopicIndex(articles)
    expect(index['2026-09-02:topic-1']).toBe('別の週の同じIDのトピック')
  })

  it('存在しない「記事日付:トピックID」で検索した場合、undefinedが返ること', () => {
    const index = buildTopicIndex(articles)
    expect(index['2026-09-16:topic-1']).toBeUndefined()
  })
})
