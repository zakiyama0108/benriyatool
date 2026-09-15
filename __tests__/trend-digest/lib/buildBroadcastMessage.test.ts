import { describe, it, expect } from 'vitest'
import { buildBroadcastTitle, buildBroadcastMessage } from '../../../app/trend-digest/lib/buildBroadcastMessage'
import type { Article, Topic } from '../../../app/trend-digest/lib/types'

// テスト用の最小限のTopicを組み立てるヘルパー(bodyの中身はbuildBroadcastMessageの
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

// 仕様: specs/trend-digest/line-broadcast/requirements.md#配信内容-2
describe('LINE配信メッセージ専用タイトルの組み立て - 記事タイトルとは別に、接頭辞+日付からなる配信専用の見出しを組み立てる', () => {
  it('edition=entertainment、日付2026-09-15から「【週刊トレンド エンタメ編】2026年9月15日号」が生成されること', () => {
    expect(buildBroadcastTitle('entertainment', '2026-09-15')).toBe('【週刊トレンド エンタメ編】2026年9月15日号')
  })

  it('edition=culture-lifestyle、日付2026-09-18から「【週刊トレンド カルチャー編】2026年9月18日号」が生成されること', () => {
    expect(buildBroadcastTitle('culture-lifestyle', '2026-09-18')).toBe('【週刊トレンド カルチャー編】2026年9月18日号')
  })
})

// 仕様: specs/trend-digest/line-broadcast/requirements.md#配信内容-1、specs/trend-digest/line-broadcast/requirements.md#配信内容-3、specs/trend-digest/line-broadcast/requirements.md#配信内容-4
describe('LINE配信メッセージ本文の組み立て - 配信専用タイトル・ジャンル名付きトピック見出し一覧・記事詳細ページリンクの3要素から配信用テキストを組み立てる', () => {
  it('トピックが1件の場合、配信専用タイトル・ジャンル名付きトピック見出し1件・記事詳細ページリンクを含むメッセージが組み立てられること', () => {
    const article: Article = {
      id: '2026-09-15-entertainment',
      edition: 'entertainment',
      date: '2026-09-15',
      topics: [buildTopic('music', 'ヒット曲がSNSで話題', 'https://example.com/music')],
    }

    const message = buildBroadcastMessage(article)

    expect(message).toBe(
      [
        '【週刊トレンド エンタメ編】2026年9月15日号',
        '',
        '・【音楽】ヒット曲がSNSで話題',
        '',
        '記事を読む',
        'https://benriyatool.com/trend-digest/2026-09-15-entertainment',
      ].join('\n')
    )
  })

  it('トピックが複数件の場合、記事データのtopics配列順のままジャンル名付きで全件箇条書きに含まれること', () => {
    const article: Article = {
      id: '2026-09-15-entertainment',
      edition: 'entertainment',
      date: '2026-09-15',
      topics: [
        buildTopic('music', 'トピック1', 'https://example.com/1'),
        buildTopic('japanese-movie', 'トピック2', 'https://example.com/2'),
        buildTopic('foreign-drama', 'トピック3', 'https://example.com/3'),
      ],
    }

    const message = buildBroadcastMessage(article)

    expect(message).toBe(
      [
        '【週刊トレンド エンタメ編】2026年9月15日号',
        '',
        '・【音楽】トピック1',
        '・【日本映画】トピック2',
        '・【海外ドラマ】トピック3',
        '',
        '記事を読む',
        'https://benriyatool.com/trend-digest/2026-09-15-entertainment',
      ].join('\n')
    )
  })

  it('各トピックのsourceUrl(出典URL)が配信メッセージ本文に含まれないこと(記事詳細ページへのリンク1本のみとする)', () => {
    const article: Article = {
      id: '2026-09-18-culture-lifestyle',
      edition: 'culture-lifestyle',
      date: '2026-09-18',
      topics: [buildTopic('gourmet', 'トピック1', 'https://source.example.com/should-not-appear')],
    }

    const message = buildBroadcastMessage(article)

    expect(message).not.toContain('https://source.example.com/should-not-appear')
  })
})
