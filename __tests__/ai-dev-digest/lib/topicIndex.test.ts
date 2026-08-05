import { describe, it, expect } from 'vitest'
import { buildTopicIndex } from '../../../app/ai-dev-digest/lib/topicIndex'
import type { Article } from '../../../app/ai-dev-digest/lib/types'

function makeArticle(date: string, topics: Article['topics']): Article {
  return { date, topics }
}

function makeTopic(id: string, heading: string): Article['topics'][number] {
  return {
    id,
    heading,
    sections: [{ heading: '見出し', teaser: 'て'.repeat(60), detail: 'し'.repeat(500) }],
    sourceType: 'official',
    sourceName: '発信者',
    sourceUrl: 'https://example.com',
    belowCriteria: false,
  }
}

const articles: Article[] = [
  makeArticle('2026-08-01', [makeTopic('topic-1', 'Anthropicが新モデルを発表'), makeTopic('topic-2', 'OpenAIの新機能')]),
  makeArticle('2026-07-31', [makeTopic('topic-1', 'Geminiのアップデート')]),
]

// 仕様: specs/ai-dev-digest/bookmark/requirements.md#付箋した記事一覧-11
describe('付箋一覧のための記事タイトル・トピック見出しの索引 - 「記事日付:トピックID」から記事タイトルとトピック見出しを引き当てる', () => {
  it('各記事・各トピックについて、buildArticleTitleで導出した記事タイトルとトピック見出しが引き当てられること', () => {
    const index = buildTopicIndex(articles)
    expect(index['2026-08-01:topic-1']).toEqual({
      articleTitle: '2026年8月1日のAIニュース',
      topicHeading: 'Anthropicが新モデルを発表',
    })
    expect(index['2026-08-01:topic-2']).toEqual({
      articleTitle: '2026年8月1日のAIニュース',
      topicHeading: 'OpenAIの新機能',
    })
  })

  it('同じトピックIDでも記事日付が異なれば別々に引き当てられること', () => {
    const index = buildTopicIndex(articles)
    expect(index['2026-07-31:topic-1']).toEqual({
      articleTitle: '2026年7月31日のAIニュース',
      topicHeading: 'Geminiのアップデート',
    })
  })

  it('存在しない「記事日付:トピックID」で検索した場合、undefinedが返ること', () => {
    const index = buildTopicIndex(articles)
    expect(index['2026-08-02:topic-1']).toBeUndefined()
  })
})
