import { describe, it, expect } from 'vitest'
import { selectCardTopics } from '../../../app/news-digest/lib/selectCardTopics'
import type { Topic } from '../../../app/news-digest/lib/types'

function makeTopic(overrides: Partial<Topic> & Pick<Topic, 'id' | 'heading'>): Topic {
  return {
    category: 'general',
    summary: {
      whatHappened: { heading: 'h', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(300) },
      whyItMatters: { heading: 'h', teaser: 'い'.repeat(60), detail: 'い'.repeat(300) },
      background: { heading: 'h', teaser: 'う'.repeat(60), detail: 'う'.repeat(300) },
      outlook: { heading: 'h', teaser: 'え'.repeat(60), detail: 'え'.repeat(300) },
    },
    importance: 3,
    sourceName: 'NHK NEWS WEB',
    sourceUrl: 'https://www3.nhk.or.jp/news/example.html',
    belowCriteria: false,
    ...overrides,
  }
}

// 仕様: specs/news-digest/article-list/requirements.md#一覧表示-2、specs/news-digest/article-list/requirements.md#一覧表示-4、specs/news-digest/article-list/requirements.md#一覧表示-5、specs/news-digest/article-list/requirements.md#ビジネスルール・制約-1
describe('カードに表示するトピック見出し・導入文を選ぶ処理 - 先頭から最大3件を見出し・カテゴリ・「何が起きたか」導入文の組で選ぶ', () => {
  it('トピックが3件以下のとき、すべてのトピックが選ばれること', () => {
    const topics = [
      makeTopic({ id: 'topic-1', heading: '見出しA', category: 'general' }),
      makeTopic({ id: 'topic-2', heading: '見出しB', category: 'business' }),
    ]
    const shown = selectCardTopics(topics)
    expect(shown).toEqual([
      { heading: '見出しA', category: 'general', whatHappenedTeaser: 'あ'.repeat(60) },
      { heading: '見出しB', category: 'business', whatHappenedTeaser: 'あ'.repeat(60) },
    ])
  })

  it('トピックが4件以上のとき、先頭3件のみが選ばれること', () => {
    const topics = Array.from({ length: 5 }, (_, i) => makeTopic({ id: `topic-${i + 1}`, heading: `見出し${i + 1}` }))
    const shown = selectCardTopics(topics)
    expect(shown).toHaveLength(3)
    expect(shown.map((t) => t.heading)).toEqual(['見出し1', '見出し2', '見出し3'])
  })

  it('whatHappenedTeaserは詳細ページと同じsummary.whatHappened.teaserがそのまま使われること(一覧専用の別要約を作らない)', () => {
    const topics = [makeTopic({ id: 'topic-1', heading: '見出しA' })]
    const shown = selectCardTopics(topics)
    expect(shown[0].whatHappenedTeaser).toBe('あ'.repeat(60))
  })
})
