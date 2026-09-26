import { describe, it, expect } from 'vitest'
import { assembleArticle } from '../../../app/news-digest/lib/assembleArticle'
import { parseArticle } from '../../../app/news-digest/lib/articleSchema'
import type { SelectedTopic } from '../../../app/news-digest/lib/candidateTypes'
import type { GeneratedContent } from '../../../app/news-digest/lib/generateContent'
import type { TopicSummary } from '../../../app/news-digest/lib/types'

function perspective(prefix: string) {
  return { heading: `${prefix}見出し`, teaser: prefix.repeat(60), detail: prefix.repeat(250) }
}

function validSummary(): TopicSummary {
  return {
    whatHappened: perspective('あ'),
    whyItMatters: perspective('い'),
    background: perspective('う'),
    outlook: perspective('え'),
  }
}

function makeCandidate(overrides: Partial<SelectedTopic> = {}): SelectedTopic {
  return {
    sourceId: 'nhk-news-web',
    sourceName: 'NHK NEWS WEB',
    category: 'general',
    heading: '与党が来年度予算の概算要求を了承',
    url: 'https://example.com/news/a',
    publishedAt: '2026-09-10T00:00:00Z',
    meetsCriteria: true,
    corroboratingSources: ['NHK NEWS WEB', '共同通信'],
    belowCriteria: false,
    ...overrides,
  }
}

function makeContent(overrides: Partial<GeneratedContent> = {}): GeneratedContent {
  return {
    heading: '与党が来年度予算の概算要求を了承',
    importance: 4,
    summary: validSummary(),
    ...overrides,
  }
}

// 仕様: specs/news-digest/weekly-publish/design.md#1週分の記事を生成する処理
describe('記事データの組み立て - 選定結果と生成済みの見出し・要約からarticle-detailのスキーマを満たすArticleを組み立てる', () => {
  it('複数候補からArticleが組み立てられ、idが記事内で一意に採番されること', () => {
    const article = assembleArticle('2026-09-16', [
      { candidate: makeCandidate(), content: makeContent() },
      { candidate: makeCandidate({ sourceId: 'kanaloco', category: 'kanagawa' }), content: makeContent({ heading: '横浜市が子育て支援の新拠点を開設' }) },
    ])
    expect(article.date).toBe('2026-09-16')
    expect(article.topics).toHaveLength(2)
    expect(article.topics[0].id).not.toBe(article.topics[1].id)
  })

  it('候補のcategory・sourceName・sourceUrl・sourcePublishedAt・belowCriteriaがそのままトピックに含まれること', () => {
    const candidate = makeCandidate({
      category: 'childcare',
      sourceName: '神奈川新聞',
      url: 'https://www.kanaloco.jp/example',
      publishedAt: '2026-09-14T05:00:00Z',
    })
    const article = assembleArticle('2026-09-16', [{ candidate, content: makeContent() }])
    const topic = article.topics[0]
    expect(topic.category).toBe('childcare')
    expect(topic.sourceName).toBe('神奈川新聞')
    expect(topic.sourceUrl).toBe('https://www.kanaloco.jp/example')
    expect(topic.sourcePublishedAt).toBe('2026-09-14T05:00:00Z')
  })

  it('生成された見出し・重要度・要約(固定4観点)がそのままトピックに含まれること(候補の原文見出しではなくcontent.headingを使う)', () => {
    const candidate = makeCandidate({ heading: '原文タイトル(そのまま使わない)' })
    const content = makeContent({ heading: 'エージェントが生成した見出し', importance: 2 })
    const article = assembleArticle('2026-09-16', [{ candidate, content }])
    expect(article.topics[0].heading).toBe('エージェントが生成した見出し')
    expect(article.topics[0].importance).toBe(2)
    expect(article.topics[0].summary).toEqual(content.summary)
  })

  it('belowCriteria: trueの候補はbelowCriteriaReasonを保持すること', () => {
    const candidate = makeCandidate({ category: 'kanagawa', belowCriteria: true, belowCriteriaReason: '裏付けメディアが1社(基準2社)' })
    const article = assembleArticle('2026-09-16', [{ candidate, content: makeContent() }])
    expect(article.topics[0].belowCriteria).toBe(true)
    expect(article.topics[0].belowCriteriaReason).toBe('裏付けメディアが1社(基準2社)')
  })
})

// 仕様: specs/news-digest/weekly-publish/requirements.md#掲載件数の保証-2
describe('週次公開における掲載件数の保証 - 1候補の生成失敗を除外し、成功した残りの候補でその週の記事を公開する', () => {
  it('生成に失敗した候補(content: null)はtopicsから除外され、成功した候補だけでArticleが組み立てられること', () => {
    const succeeded = makeCandidate({ sourceId: 'ok', heading: '成功した候補' })
    const failed = makeCandidate({ sourceId: 'ng', heading: '生成に失敗した候補' })
    const article = assembleArticle('2026-09-16', [
      { candidate: succeeded, content: makeContent({ heading: '成功した候補' }) },
      { candidate: failed, content: null },
    ])
    expect(article.topics).toHaveLength(1)
    expect(article.topics[0].heading).toBe('成功した候補')
  })

  it('選定された全候補の生成が失敗した場合、topicsが0件のArticleになり、article-detailのスキーマ検証(parseArticle)がtopics不足のエラーを投げること(write-article.tsが非ゼロ終了しPR作成に進まない)', () => {
    const article = assembleArticle('2026-09-16', [{ candidate: makeCandidate(), content: null }])
    expect(article.topics).toHaveLength(0)
    expect(() => parseArticle(article, '2026-09-16.json')).toThrow()
  })
})

// 仕様: specs/news-digest/weekly-publish/requirements.md#実行-3
describe('記事データの配信形式 - 生成した記事はビルド時に取り込まれるコンテンツファイルとして扱えること', () => {
  it('組み立てたArticleがarticle-detailのスキーマ検証(parseArticle)を通り、そのままcontent/news-digest/articles/配下のJSONとして書き出せる形になっていること', () => {
    const article = assembleArticle('2026-09-16', [
      { candidate: makeCandidate(), content: makeContent() },
      { candidate: makeCandidate({ sourceId: 'kanaloco', category: 'kanagawa' }), content: makeContent({ heading: '別のトピック' }) },
    ])
    expect(() => parseArticle(article, '2026-09-16.json')).not.toThrow()
  })
})
