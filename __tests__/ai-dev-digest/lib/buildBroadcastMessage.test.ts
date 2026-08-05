import { describe, it, expect } from 'vitest'
import { buildBroadcastMessage } from '../../../app/ai-dev-digest/lib/buildBroadcastMessage'
import type { Article, Topic } from '../../../app/ai-dev-digest/lib/types'

// テスト用の最小限のTopicを組み立てるヘルパー(sectionsの中身はbuildBroadcastMessageの
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

// 仕様: specs/ai-dev-digest/line-broadcast/requirements.md#配信内容-1、specs/ai-dev-digest/line-broadcast/requirements.md#配信内容-2、specs/ai-dev-digest/line-broadcast/requirements.md#配信内容-3、specs/ai-dev-digest/line-broadcast/requirements.md#配信内容-4
describe('LINE配信メッセージ本文の組み立て - 記事タイトル・トピック見出し一覧・記事詳細ページリンクの3要素から配信用テキストを組み立てる', () => {
  it('トピックが1件の場合、記事タイトル・トピック見出し1件・記事詳細ページリンクを含むメッセージが組み立てられること', () => {
    const article: Article = {
      date: '2026-08-01',
      topics: [buildTopic('Anthropicが新モデルを発表', 'https://www.anthropic.com/news/example')],
    }

    const message = buildBroadcastMessage(article)

    expect(message).toBe(
      [
        '2026年8月1日のAIニュース',
        '',
        '・Anthropicが新モデルを発表',
        '',
        '記事を読む',
        'https://benriyatool.com/ai-dev-digest/2026-08-01',
      ].join('\n')
    )
  })

  it('トピックが5件の場合、掲載順(topics配列順)のまま5件すべての見出しが箇条書きで含まれること', () => {
    const article: Article = {
      date: '2026-08-02',
      topics: [
        buildTopic('トピック1', 'https://example.com/1'),
        buildTopic('トピック2', 'https://example.com/2'),
        buildTopic('トピック3', 'https://example.com/3'),
        buildTopic('トピック4', 'https://example.com/4'),
        buildTopic('トピック5', 'https://example.com/5'),
      ],
    }

    const message = buildBroadcastMessage(article)

    expect(message).toBe(
      [
        '2026年8月2日のAIニュース',
        '',
        '・トピック1',
        '・トピック2',
        '・トピック3',
        '・トピック4',
        '・トピック5',
        '',
        '記事を読む',
        'https://benriyatool.com/ai-dev-digest/2026-08-02',
      ].join('\n')
    )
  })

  it('各トピックのsourceUrl(出典URL)が配信メッセージ本文に含まれないこと(記事詳細ページへのリンク1本のみとする)', () => {
    const article: Article = {
      date: '2026-08-03',
      topics: [buildTopic('トピック1', 'https://source.example.com/should-not-appear')],
    }

    const message = buildBroadcastMessage(article)

    expect(message).not.toContain('https://source.example.com/should-not-appear')
  })
})
