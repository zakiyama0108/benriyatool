import { describe, it, expect } from 'vitest'
import { buildBroadcastTitle, buildBroadcastMessage } from '../../../app/research-digest/lib/buildBroadcastMessage'
import type { Article, Finding, Impact } from '../../../app/research-digest/lib/types'
import { GENRE_LABELS, GENRE_ORDER } from '../../../app/research-digest/lib/types'

// ジャンル順の何番目かでジャンルを指定する(genres.jsonの追記に依存しないため)
function buildFinding(genreIndex: number, impact: Impact, overrides: Partial<Finding> = {}): Finding {
  const genre = GENRE_ORDER[genreIndex]
  return {
    id: genre,
    genre,
    heading: `見出し${genreIndex}`,
    body: 'x'.repeat(200),
    impact,
    impactReason: '根拠',
    sourceTitle: '論文名',
    sourceName: '掲載誌',
    sourceUrl: 'https://example.com/a',
    doi: null,
    publishedYear: 2025,
    isPreprint: false,
    ...overrides,
  }
}

function buildArticle(findings: Finding[], emptyGenres: Article['emptyGenres'] = []): Article {
  return { id: '2026-10-05-body-life', edition: 'body-life', date: '2026-10-05', findings, emptyGenres }
}

const label = (index: number) => GENRE_LABELS[GENRE_ORDER[index]]

// 仕様: specs/research-digest/line-broadcast/requirements.md#配信内容-2
describe('LINE配信メッセージ専用タイトルの組み立て - 「【週刊研究発見】」+編のラベル+日付から配信専用の見出しを組み立てる', () => {
  it('日付2026-10-05・からだ・くらし編から「【週刊研究発見】からだ・くらし編 2026年10月5日号」が生成されること', () => {
    expect(buildBroadcastTitle('2026-10-05', 'body-life')).toBe('【週刊研究発見】からだ・くらし編 2026年10月5日号')
  })

  it('日付2026-10-10・科学・社会編から「【週刊研究発見】科学・社会編 2026年10月10日号」が生成されること', () => {
    expect(buildBroadcastTitle('2026-10-10', 'science-society')).toBe('【週刊研究発見】科学・社会編 2026年10月10日号')
  })
})

// 仕様: specs/research-digest/line-broadcast/requirements.md#配信内容-1、specs/research-digest/line-broadcast/requirements.md#配信内容-2、specs/research-digest/line-broadcast/requirements.md#配信内容-3、specs/research-digest/line-broadcast/requirements.md#配信内容-5
describe('配信メッセージの組み立て - タイトル・研究の見出し一覧・記事ページへのリンクで構成する', () => {
  it('1行目が配信専用タイトル、見出しが「・【影響度 大/ジャンル名】見出し」の形で並び、末尾に記事URLが1本だけ載ること', () => {
    const message = buildBroadcastMessage(buildArticle([buildFinding(0, 'high')]))

    expect(message).toBe(
      [
        '【週刊研究発見】からだ・くらし編 2026年10月5日号',
        '',
        `・【影響度 大/${label(0)}】見出し0`,
        '',
        '記事を読む',
        'https://benriyatool.com/research-digest/2026-10-05-body-life',
      ].join('\n')
    )
  })

  it('掲載した研究の見出しが、上限を設けずすべて載ること', () => {
    const findings = GENRE_ORDER.map((_, i) => buildFinding(i, 'medium'))
    const message = buildBroadcastMessage(buildArticle(findings))

    expect(message.split('\n').filter((line) => line.startsWith('・'))).toHaveLength(GENRE_ORDER.length)
  })

  it('出典URL(sourceUrl)が配信メッセージ本文に含まれないこと(記事詳細ページへのリンク1本のみとする)', () => {
    const message = buildBroadcastMessage(
      buildArticle([buildFinding(0, 'high', { sourceUrl: 'https://source.example.com/should-not-appear' })])
    )
    expect(message).not.toContain('https://source.example.com/should-not-appear')
    expect(message.match(/https?:\/\//g)).toHaveLength(1)
  })
})

// 仕様: specs/research-digest/line-broadcast/requirements.md#配信内容-4
describe('見出し一覧の並び順 - 影響度の大きい順に並べ、掲載できなかったジャンルは載せない', () => {
  it('影響度の大きい順に並び、同じ影響度の中ではジャンル順に並ぶこと', () => {
    const message = buildBroadcastMessage(
      buildArticle([buildFinding(2, 'medium'), buildFinding(1, 'high'), buildFinding(0, 'medium'), buildFinding(3, 'high')])
    )

    const lines = message.split('\n').filter((line) => line.startsWith('・'))
    expect(lines).toEqual([
      `・【影響度 大/${label(1)}】見出し1`,
      `・【影響度 大/${label(3)}】見出し3`,
      `・【影響度 中/${label(0)}】見出し0`,
      `・【影響度 中/${label(2)}】見出し2`,
    ])
  })

  it('候補なし・収集失敗・生成失敗のジャンルは見出し一覧に載らないこと', () => {
    const message = buildBroadcastMessage(
      buildArticle(
        [buildFinding(0, 'high')],
        [
          { genre: GENRE_ORDER[1], reason: 'no-candidate' },
          { genre: GENRE_ORDER[2], reason: 'collection-failed', collectionFailureReason: 'timeout' },
          { genre: GENRE_ORDER[3], reason: 'generation-failed' },
        ]
      )
    )

    expect(message.split('\n').filter((line) => line.startsWith('・'))).toHaveLength(1)
    expect(message).not.toContain(label(1))
  })
})

// 仕様: specs/research-digest/line-broadcast/requirements.md#配信内容-6
describe('採用0件の回の配信メッセージ - 見出し一覧の代わりに「掲載できる記事がなかった」旨を載せて送る', () => {
  it('研究が0件の場合、見出しの行の代わりに「今週は掲載できる記事がありませんでした」の1行が入り、タイトルと記事リンクも載ること', () => {
    const message = buildBroadcastMessage(
      buildArticle([], [{ genre: GENRE_ORDER[0], reason: 'no-candidate' }])
    )

    expect(message).toBe(
      [
        '【週刊研究発見】からだ・くらし編 2026年10月5日号',
        '',
        '今週は掲載できる記事がありませんでした',
        '',
        '記事を読む',
        'https://benriyatool.com/research-digest/2026-10-05-body-life',
      ].join('\n')
    )
  })
})
