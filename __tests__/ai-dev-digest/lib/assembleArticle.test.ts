import { describe, it, expect } from 'vitest'
import { assembleArticle } from '../../../app/ai-dev-digest/lib/assembleArticle'
import { parseArticle } from '../../../app/ai-dev-digest/lib/articleSchema'
import type { GeneratedTopicInput } from '../../../app/ai-dev-digest/lib/assembleArticle'

function makeInput(overrides: Partial<GeneratedTopicInput> = {}): GeneratedTopicInput {
  return {
    heading: 'Anthropicが新モデルを発表',
    sections: [
      { heading: '何が発表されたか', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
      { heading: '開発者への影響', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
    ],
    sourceType: 'official',
    sourceName: 'Anthropic',
    sourceUrl: 'https://www.anthropic.com/news/example',
    sourcePublishedAt: '2026-07-31T10:00:00Z',
    belowCriteria: false,
    ...overrides,
  }
}

// 仕様: specs/ai-dev-digest/daily-publish/design.md#1日分の記事を生成する処理
describe('記事データの組み立て - 選定結果と生成済みの見出し・要約からarticle-detailのスキーマを満たすArticleを組み立てる', () => {
  it('複数トピックからArticleが組み立てられ、idが記事内で一意に採番されること', () => {
    const article = assembleArticle('2026-08-01', [makeInput(), makeInput({ heading: '別のトピック' })])
    expect(article.date).toBe('2026-08-01')
    expect(article.topics).toHaveLength(2)
    expect(article.topics[0].id).not.toBe(article.topics[1].id)
  })

  it('sections(章立て構成の要約。導入文teaser+詳細文detail)がそのままArticleのトピックに含まれること', () => {
    const sections = [
      { heading: '何が発表されたか', teaser: 'あ'.repeat(60), detail: 'あ'.repeat(500) },
      { heading: '開発者への影響', teaser: 'い'.repeat(60), detail: 'い'.repeat(500) },
    ]
    const article = assembleArticle('2026-08-01', [makeInput({ sections })])
    expect(article.topics[0].sections).toEqual(sections)
  })

  it('youtubeVideoIdを持つトピックはそのままArticleに含まれ、持たないトピックには含まれないこと', () => {
    const article = assembleArticle('2026-08-01', [
      makeInput({ sourceType: 'individual-youtube', youtubeVideoId: 'dQw4w9WgXcQ' }),
      makeInput(),
    ])
    expect(article.topics[0].youtubeVideoId).toBe('dQw4w9WgXcQ')
    expect(article.topics[1].youtubeVideoId).toBeUndefined()
  })

  it('belowCriteria: trueのトピックはbelowCriteriaReasonを保持すること', () => {
    const article = assembleArticle('2026-08-01', [
      makeInput({ sourceType: 'qiita', belowCriteria: true, belowCriteriaReason: 'いいね数18件(基準30件に12件不足)' }),
    ])
    expect(article.topics[0].belowCriteria).toBe(true)
    expect(article.topics[0].belowCriteriaReason).toBe('いいね数18件(基準30件に12件不足)')
  })

  it('sourcePublishedAt(選定結果由来の投稿日時)がそのままArticleのトピックに含まれること', () => {
    const article = assembleArticle('2026-08-01', [makeInput({ sourcePublishedAt: '2026-07-29T03:00:00Z' })])
    expect(article.topics[0].sourcePublishedAt).toBe('2026-07-29T03:00:00Z')
  })

  it('sourcePublishedAtを持たないトピック(本フィールド導入前の既存データ相当)には含まれないこと', () => {
    const article = assembleArticle('2026-08-01', [makeInput({ sourcePublishedAt: undefined })])
    expect(article.topics[0].sourcePublishedAt).toBeUndefined()
  })

})

// 仕様: specs/ai-dev-digest/daily-publish/requirements.md#実行-3
describe('記事データの配信形式 - 生成した記事はビルド時に取り込まれるコンテンツファイルとして扱えること', () => {
  it('組み立てたArticleがarticle-detailのスキーマ検証(parseArticle)を通り、そのままcontent/ai-dev-digest/articles/配下のJSONとして書き出せる形になっていること', () => {
    const article = assembleArticle('2026-08-01', [makeInput(), makeInput({ heading: '別のトピック' })])
    expect(() => parseArticle(article, '2026-08-01.json')).not.toThrow()
  })
})
