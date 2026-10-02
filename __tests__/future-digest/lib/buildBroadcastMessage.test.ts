import { describe, it, expect } from 'vitest'
import {
  selectRepresentatives,
  buildBroadcastTitle,
  buildBroadcastMessage,
} from '../../../app/future-digest/lib/buildBroadcastMessage'
import type { Article, Prediction } from '../../../app/future-digest/lib/types'

function buildPrediction(overrides: Partial<Prediction> & Pick<Prediction, 'genre' | 'horizon' | 'impact'>): Prediction {
  const id = `${overrides.genre}--${overrides.horizon}`
  return {
    id,
    heading: `見出し:${id}`,
    body: 'x'.repeat(200),
    impactReason: '根拠',
    targetPeriod: '2030年まで',
    sourceTitle: '元記事',
    sourceName: '情報源',
    sourceUrl: 'https://example.com/a',
    ...overrides,
  }
}

function buildArticle(predictions: Prediction[], issueNumber = 1): Article {
  return { id: '2026-10-01', date: '2026-10-01', issueNumber, predictions, emptySlots: [] }
}

// 仕様: specs/future-digest/line-broadcast/requirements.md#配信内容-3、specs/future-digest/line-broadcast/requirements.md#配信内容-4、specs/future-digest/line-broadcast/requirements.md#配信内容-5
describe('代表見出しの選択 - ジャンルごとに影響度が最も大きい1本を選び、影響度順に並べる', () => {
  it('ジャンルごとに影響度の最も大きい予測が選ばれること', () => {
    const article = buildArticle([
      buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'medium' }),
      buildPrediction({ genre: 'technology-ai', horizon: 'long', impact: 'high' }),
    ])

    const representatives = selectRepresentatives(article)
    expect(representatives).toHaveLength(1)
    expect(representatives[0].heading).toBe('見出し:technology-ai--long')
    expect(representatives[0].impact).toBe('high')
  })

  it('同じジャンルで影響度が2本とも同じ場合、時間軸の近い方(HORIZON_ORDERで先の方)が選ばれること', () => {
    const article = buildArticle([
      buildPrediction({ genre: 'technology-ai', horizon: 'long', impact: 'high' }),
      buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'high' }),
    ])

    const representatives = selectRepresentatives(article)
    expect(representatives[0].heading).toBe('見出し:technology-ai--near')
  })

  it('性・恋愛ジャンル(lineExcluded: true)の予測は代表見出しに含まれないこと', () => {
    const article = buildArticle([buildPrediction({ genre: 'sexuality-romance', horizon: 'near', impact: 'high' })])
    expect(selectRepresentatives(article)).toHaveLength(0)
  })

  it('掲載した予測が1本もないジャンル(両枠が候補なし・収集失敗・生成失敗)は代表見出しに含まれないこと', () => {
    const article: Article = {
      id: '2026-10-01',
      date: '2026-10-01',
      issueNumber: 1,
      predictions: [],
      emptySlots: [
        { genre: 'medical-health', horizon: 'near', reason: 'no-candidate' },
        { genre: 'medical-health', horizon: 'long', reason: 'collection-failed', collectionFailureReason: 'timeout' },
      ],
    }
    expect(selectRepresentatives(article)).toHaveLength(0)
  })

  it('影響度の大きい順に並び、同じ影響度の中ではジャンル順に並ぶこと', () => {
    const article = buildArticle([
      buildPrediction({ genre: 'geopolitics', horizon: 'near', impact: 'high' }),
      buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'high' }),
      buildPrediction({ genre: 'medical-health', horizon: 'near', impact: 'medium' }),
    ])

    const representatives = selectRepresentatives(article)
    expect(representatives.map((r) => r.genre)).toEqual(['technology-ai', 'geopolitics', 'medical-health'])
  })
})

// 仕様: specs/future-digest/line-broadcast/requirements.md#配信内容-2
describe('LINE配信メッセージ専用タイトルの組み立て - 「【週刊未来予測】」+日付から配信専用の見出しを組み立てる', () => {
  it('日付2026-10-01から「【週刊未来予測】2026年10月1日号」が生成されること', () => {
    expect(buildBroadcastTitle('2026-10-01')).toBe('【週刊未来予測】2026年10月1日号')
  })
})

// 仕様: specs/future-digest/line-broadcast/requirements.md#配信内容-1、specs/future-digest/line-broadcast/requirements.md#配信内容-2、specs/future-digest/line-broadcast/requirements.md#配信内容-6、specs/future-digest/line-broadcast/requirements.md#配信内容-7
describe('配信メッセージの組み立て - タイトル・時間軸・代表見出し・記事ページへのリンクで構成する', () => {
  it('1行目が配信専用タイトル、2行目がその回の時間軸、代表見出しが「・【影響度 大/ジャンル名】見出し」の形で並び、末尾に記事URLが1本だけ載ること', () => {
    const article = buildArticle([buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'high' })])

    const message = buildBroadcastMessage(article)

    expect(message).toBe(
      [
        '【週刊未来予測】2026年10月1日号',
        '今回の時間軸: 近未来・長期未来',
        '',
        '・【影響度 大/テクノロジー・AI】見出し:technology-ai--near',
        '',
        '記事を読む',
        'https://benriyatool.com/future-digest/2026-10-01',
      ].join('\n')
    )
  })

  it('出典URL(sourceUrl)が配信メッセージ本文に含まれないこと(記事詳細ページへのリンク1本のみとする)', () => {
    const article = buildArticle([
      buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'high', sourceUrl: 'https://source.example.com/should-not-appear' }),
    ])
    expect(buildBroadcastMessage(article)).not.toContain('https://source.example.com/should-not-appear')
  })

  it('性・恋愛ジャンルの見出しが配信メッセージ本文に含まれないこと', () => {
    const article = buildArticle([
      buildPrediction({ genre: 'technology-ai', horizon: 'near', impact: 'high' }),
      buildPrediction({ genre: 'sexuality-romance', horizon: 'near', impact: 'high', heading: '性・恋愛の見出し' }),
    ])
    expect(buildBroadcastMessage(article)).not.toContain('性・恋愛の見出し')
  })

  it('代表見出しが0件でも予測が1件以上ある場合(採用した予測が性・恋愛ジャンルだけだった回)、タイトル・時間軸・記事リンクだけのメッセージになること', () => {
    const article = buildArticle([buildPrediction({ genre: 'sexuality-romance', horizon: 'near', impact: 'high' })])

    const message = buildBroadcastMessage(article)

    expect(message).toBe(
      [
        '【週刊未来予測】2026年10月1日号',
        '今回の時間軸: 近未来・長期未来',
        '',
        '記事を読む',
        'https://benriyatool.com/future-digest/2026-10-01',
      ].join('\n')
    )
  })

  it('その回の予測が0件(採用0件の回)の場合、代表見出しの行の代わりに「今週は掲載できる予測がありませんでした」の1行が入ること', () => {
    const article = buildArticle([])

    const message = buildBroadcastMessage(article)

    expect(message).toBe(
      [
        '【週刊未来予測】2026年10月1日号',
        '今回の時間軸: 近未来・長期未来',
        '',
        '今週は掲載できる予測がありませんでした',
        '',
        '記事を読む',
        'https://benriyatool.com/future-digest/2026-10-01',
      ].join('\n')
    )
  })
})
