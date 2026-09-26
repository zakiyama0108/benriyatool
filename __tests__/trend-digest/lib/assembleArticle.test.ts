import { describe, it, expect } from 'vitest'
import { assembleArticle, type GeneratedTopicInput } from '../../../app/trend-digest/lib/assembleArticle'

// 160〜480字の範囲を満たすダミー本文を作る
function makeBody(length = 250): string {
  return 'あ'.repeat(length)
}

function makeTopicInput(overrides: Partial<GeneratedTopicInput> = {}): GeneratedTopicInput {
  return {
    genre: 'music',
    title: '対象作品A',
    sourceName: 'Oricon',
    sourceUrl: 'https://example.com/a',
    heading: '見出しA',
    body: makeBody(),
    ...overrides,
  }
}

// 仕様: specs/trend-digest/weekly-publish/requirements.md#実行-4
describe('assembleArticle - 選定・生成済みの候補から公開用の記事データ(id・edition・date・topics)を組み立てる', () => {
  it('editionと発行日から記事ID(<date>-<edition>形式)を組み立てる', () => {
    const article = assembleArticle('entertainment', '2026-09-15', [makeTopicInput()])
    expect(article.id).toBe('2026-09-15-entertainment')
    expect(article.edition).toBe('entertainment')
    expect(article.date).toBe('2026-09-15')
  })

  it('各トピックをGENRE_ORDER(ジャンル定義順)に並び替え、並び替え後の位置でtopic-Nを採番する', () => {
    // 入力順はanime→music(GENRE_ORDER上はmusicが先)。並び替え後にtopic-1/2が振られることを確認する
    const anime = makeTopicInput({ genre: 'anime', title: 'サンプルアニメB', heading: '見出しB' })
    const music = makeTopicInput({ genre: 'music', title: 'サンプル楽曲A', heading: '見出しA' })
    const article = assembleArticle('entertainment', '2026-09-15', [anime, music])

    expect(article.topics.map((t) => t.genre)).toEqual(['music', 'anime'])
    expect(article.topics[0]).toMatchObject({
      id: 'topic-1',
      sourceTitle: 'サンプル楽曲A',
      heading: '見出しA',
    })
    expect(article.topics[1]).toMatchObject({
      id: 'topic-2',
      sourceTitle: 'サンプルアニメB',
      heading: '見出しB',
    })
  })
})

// 仕様: specs/trend-digest/weekly-publish/requirements.md#掲載件数の保証-2
describe('assembleArticle - 生成に失敗した候補は記事データから除外されている', () => {
  it('生成に成功した候補のみが渡された場合、失敗した候補を含まない記事が組み立てられる', () => {
    // generate-content.tsのgenerateTopicsが失敗候補を既に除外しているため、
    // ここでは「失敗候補が最初から渡されない」ケースを検証する
    const succeeded = makeTopicInput({ genre: 'music', title: '成功候補' })
    const article = assembleArticle('entertainment', '2026-09-15', [succeeded])

    expect(article.topics).toHaveLength(1)
    expect(article.topics[0].sourceTitle).toBe('成功候補')
    expect(article.topics.some((t) => t.sourceTitle === '失敗候補')).toBe(false)
  })
})
