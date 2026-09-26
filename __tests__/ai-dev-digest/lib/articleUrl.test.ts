import { describe, it, expect } from 'vitest'
import { buildArticleUrl } from '../../../app/ai-dev-digest/lib/articleUrl'
import { buildBroadcastMessage } from '../../../app/ai-dev-digest/lib/buildBroadcastMessage'
import type { Article, Topic } from '../../../app/ai-dev-digest/lib/types'

// テスト用の最小限のTopicを組み立てるヘルパー(sectionsの中身はbuildArticleUrlの
// 出力に影響しないため、型を満たすだけの簡易な値にする)
function buildTopic(heading: string, sourceUrl: string): Topic {
  return {
    id: heading,
    heading,
    sections: [
      { heading: 'x', teaser: 'x'.repeat(40), detail: 'x'.repeat(400) },
      { heading: 'y', teaser: 'y'.repeat(40), detail: 'y'.repeat(400) },
    ],
    sourceType: 'official',
    sourceName: 'テスト発信者',
    sourceUrl,
    belowCriteria: false,
  }
}

// 仕様: specs/ai-dev-digest/line-broadcast/requirements.md#配信内容-4
describe('記事詳細ページURLの導出 - 配信本文に載せるURLと、記事ページ公開確認に使うURLを同じ関数から導出する', () => {
  it('記事データの日付から記事詳細ページURLが導出されること', () => {
    const article: Article = {
      date: '2026-08-01',
      topics: [buildTopic('Anthropicが新モデルを発表', 'https://www.anthropic.com/news/example')],
    }

    expect(buildArticleUrl(article)).toBe('https://benriyatool.com/ai-dev-digest/2026-08-01')
  })

  it('buildBroadcastMessageの本文末尾のURLが、buildArticleUrlの戻り値と一致すること(通知に載るURLと疎通確認するURLが食い違わないようにするため)', () => {
    const article: Article = {
      date: '2026-08-02',
      topics: [buildTopic('トピック1', 'https://example.com/1')],
    }

    const message = buildBroadcastMessage(article)
    const lastLine = message.split('\n').at(-1)

    expect(lastLine).toBe(buildArticleUrl(article))
  })
})
