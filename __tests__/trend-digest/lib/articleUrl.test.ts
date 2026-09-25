import { describe, it, expect } from 'vitest'
import { buildArticleUrl } from '../../../app/trend-digest/lib/articleUrl'
import { buildBroadcastMessage } from '../../../app/trend-digest/lib/buildBroadcastMessage'
import type { Article, Topic } from '../../../app/trend-digest/lib/types'

// テスト用の最小限のTopicを組み立てるヘルパー(bodyの中身はbuildArticleUrlの
// 出力に影響しないため、バリデーションを満たすだけの簡易な値にする)
function buildTopic(genre: Topic['genre'], heading: string, sourceUrl: string): Topic {
  return {
    id: heading,
    genre,
    heading,
    body: 'x'.repeat(200),
    sourceTitle: heading,
    sourceName: 'テスト発信者',
    sourceUrl,
  }
}

// 仕様: specs/trend-digest/line-broadcast/requirements.md#配信内容-4
describe('記事詳細ページURLの導出 - 配信本文に載せるURLと、記事ページ公開確認に使うURLを同じ関数から導出する', () => {
  it('記事データのidから記事詳細ページURLが導出されること', () => {
    const article: Article = {
      id: '2026-09-15-entertainment',
      edition: 'entertainment',
      date: '2026-09-15',
      topics: [buildTopic('music', 'ヒット曲がSNSで話題', 'https://example.com/music')],
    }

    expect(buildArticleUrl(article)).toBe('https://benriyatool.com/trend-digest/2026-09-15-entertainment')
  })

  it('buildBroadcastMessageの本文末尾のURLが、buildArticleUrlの戻り値と一致すること(通知に載るURLと疎通確認するURLが食い違わないようにするため)', () => {
    const article: Article = {
      id: '2026-09-18-culture-lifestyle',
      edition: 'culture-lifestyle',
      date: '2026-09-18',
      topics: [buildTopic('gourmet', 'トピック1', 'https://example.com/1')],
    }

    const message = buildBroadcastMessage(article)
    const lastLine = message.split('\n').at(-1)

    expect(lastLine).toBe(buildArticleUrl(article))
  })
})
