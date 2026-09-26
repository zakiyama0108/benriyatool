import { describe, it, expect } from 'vitest'
import { buildArticleUrl } from '../../../app/news-digest/lib/articleUrl'
import { buildBroadcastMessage } from '../../../app/news-digest/lib/buildBroadcastMessage'
import type { Article, Topic } from '../../../app/news-digest/lib/types'

// テスト用の最小限のTopicを組み立てるヘルパー(summary等の中身はbuildArticleUrlの
// 出力に影響しないため、型を満たすだけの簡易な値にする)
function buildTopic(heading: string, sourceUrl: string): Topic {
  const perspective = { heading: 'x', teaser: 'x'.repeat(40), detail: 'x'.repeat(200) }
  return {
    id: heading,
    heading,
    category: 'general',
    summary: {
      whatHappened: perspective,
      whyItMatters: perspective,
      background: perspective,
      outlook: perspective,
    },
    importance: 3,
    sourceName: 'テスト発信者',
    sourceUrl,
    belowCriteria: false,
  }
}

// 仕様: specs/news-digest/line-broadcast/requirements.md#配信内容-4
describe('記事詳細ページURLの導出 - 配信本文に載せるURLと、記事ページ公開確認に使うURLを同じ関数から導出する', () => {
  it('記事データの日付から記事詳細ページURLが導出されること', () => {
    const article: Article = {
      date: '2026-08-05',
      topics: [buildTopic('物価高対策の新政策を発表', 'https://www.example.com/news/1')],
    }

    expect(buildArticleUrl(article)).toBe('https://benriyatool.com/news-digest/2026-08-05')
  })

  it('buildBroadcastMessageの本文末尾のURLが、buildArticleUrlの戻り値と一致すること(通知に載るURLと疎通確認するURLが食い違わないようにするため)', () => {
    const article: Article = {
      date: '2026-08-12',
      topics: [buildTopic('トピック1', 'https://example.com/1')],
    }

    const message = buildBroadcastMessage(article)
    const lastLine = message.split('\n').at(-1)

    expect(lastLine).toBe(buildArticleUrl(article))
  })
})
