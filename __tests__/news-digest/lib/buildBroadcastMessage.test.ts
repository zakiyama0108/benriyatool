import { describe, it, expect } from 'vitest'
import { buildBroadcastMessage } from '../../../app/news-digest/lib/buildBroadcastMessage'
import type { Article, Topic } from '../../../app/news-digest/lib/types'

// テスト用の最小限のTopicを組み立てるヘルパー(summary等の中身はbuildBroadcastMessageの
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

// 仕様: specs/news-digest/line-broadcast/requirements.md#配信内容-1、specs/news-digest/line-broadcast/requirements.md#配信内容-2、specs/news-digest/line-broadcast/requirements.md#配信内容-3、specs/news-digest/line-broadcast/requirements.md#配信内容-4
describe('LINE配信メッセージ本文の組み立て - 記事タイトル・トピック見出し一覧・記事詳細ページリンクの3要素から配信用テキストを組み立てる', () => {
  it('トピックが1件の場合、記事タイトル・トピック見出し1件・記事詳細ページリンクを含むメッセージが組み立てられること', () => {
    const article: Article = {
      date: '2026-08-05',
      topics: [buildTopic('物価高対策の新政策を発表', 'https://www.example.com/news/1')],
    }

    const message = buildBroadcastMessage(article)

    expect(message).toBe(
      [
        '2026年8月5日週の重要ニュース',
        '',
        '・物価高対策の新政策を発表',
        '',
        '記事を読む',
        'https://benriyatool.com/news-digest/2026-08-05',
      ].join('\n')
    )
  })

  it('トピックが7件(上限)の場合、掲載順(topics配列順)のまま7件すべての見出しが箇条書きで含まれること', () => {
    const article: Article = {
      date: '2026-08-12',
      topics: [
        buildTopic('トピック1', 'https://example.com/1'),
        buildTopic('トピック2', 'https://example.com/2'),
        buildTopic('トピック3', 'https://example.com/3'),
        buildTopic('トピック4', 'https://example.com/4'),
        buildTopic('トピック5', 'https://example.com/5'),
        buildTopic('トピック6', 'https://example.com/6'),
        buildTopic('トピック7', 'https://example.com/7'),
      ],
    }

    const message = buildBroadcastMessage(article)

    expect(message).toBe(
      [
        '2026年8月12日週の重要ニュース',
        '',
        '・トピック1',
        '・トピック2',
        '・トピック3',
        '・トピック4',
        '・トピック5',
        '・トピック6',
        '・トピック7',
        '',
        '記事を読む',
        'https://benriyatool.com/news-digest/2026-08-12',
      ].join('\n')
    )
  })

  it('各トピックのsourceUrl(出典URL)が配信メッセージ本文に含まれないこと(記事詳細ページへのリンク1本のみとする)', () => {
    const article: Article = {
      date: '2026-08-19',
      topics: [buildTopic('トピック1', 'https://source.example.com/should-not-appear')],
    }

    const message = buildBroadcastMessage(article)

    expect(message).not.toContain('https://source.example.com/should-not-appear')
  })
})
