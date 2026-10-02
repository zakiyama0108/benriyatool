import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { assembleArticle, toTopicTrend, type GeneratedTopicInput } from '../../../app/trend-digest/lib/assembleArticle'
import { parseArticle } from '../../../app/trend-digest/lib/articleSchema'
import { collectPublishRecords } from '../../../app/trend-digest/lib/publishRecords'
import { normalizeTitle } from '../../../app/trend-digest/lib/selection'
import { GENRE_ORDER, type TopicTrend } from '../../../app/trend-digest/lib/types'
import type { SelectedTopic } from '../../../app/trend-digest/lib/candidateTypes'

function makeTrend(overrides: Partial<TopicTrend> = {}): TopicTrend {
  return {
    durationLabel: 'talked',
    heatLabel: 'high',
    continuationDays: 20,
    continuationStartDate: '2026-08-26',
    reportCount: 2,
    originRegion: '日本',
    currentRegions: ['日本', '北米'],
    ...overrides,
  }
}

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
    trend: makeTrend(),
    ...overrides,
  }
}

// 仕様: specs/trend-digest/weekly-publish/requirements.md#実行-4
describe('assembleArticle - 選定・生成済みの候補から公開用の記事データ(id・edition・date・topics)を組み立てる', () => {
  it('editionと発行日から記事ID(<date>-<edition>形式)を組み立てる', () => {
    const article = assembleArticle('entertainment', '2026-09-15', [makeTopicInput()], [])
    expect(article.id).toBe('2026-09-15-entertainment')
    expect(article.edition).toBe('entertainment')
    expect(article.date).toBe('2026-09-15')
  })

  it('各トピックをGENRE_ORDER(ジャンル定義順)に並び替え、並び替え後の位置でtopic-Nを採番する', () => {
    // 入力順はanime→music(GENRE_ORDER上はmusicが先)。並び替え後にtopic-1/2が振られることを確認する
    const anime = makeTopicInput({ genre: 'anime', title: 'サンプルアニメB', heading: '見出しB' })
    const music = makeTopicInput({ genre: 'music', title: 'サンプル楽曲A', heading: '見出しA' })
    const article = assembleArticle('entertainment', '2026-09-15', [anime, music], [])

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
    const article = assembleArticle('entertainment', '2026-09-15', [succeeded], [])

    expect(article.topics).toHaveLength(1)
    expect(article.topics[0].sourceTitle).toBe('成功候補')
    expect(article.topics.some((t) => t.sourceTitle === '失敗候補')).toBe(false)
  })
})

// 仕様: specs/trend-digest/weekly-publish/requirements.md#掲載件数の保証-1、specs/trend-digest/weekly-publish/requirements.md#掲載件数の保証-2
describe('assembleArticle - 情報源から取得できなかったジャンル・生成に失敗したジャンルもunavailableGenresに入り、全ジャンルが記事に現れる', () => {
  it('情報源から項目を取得できなかったジャンルと生成に失敗して除外したジャンルの両方がunavailableGenresに入る', () => {
    const music = makeTopicInput({ genre: 'music' })
    // entertainment編の残り8ジャンルのうち、japanese-movieは情報源から取得できなかった、
    // foreign-movieは生成に失敗して除外したと想定し、どちらもunavailableGenresとして渡す
    const article = assembleArticle('entertainment', '2026-09-15', [music], ['japanese-movie', 'foreign-movie'])

    expect(article.unavailableGenres).toEqual(['japanese-movie', 'foreign-movie'])
  })

  it('topicsのジャンルとunavailableGenresを合わせるとGENRE_ORDER[edition]と過不足なく一致する(ジャンルが黙って記事から消えない回帰テスト)', () => {
    const genres = GENRE_ORDER.entertainment
    // 先頭ジャンルだけ生成に成功、残りは(情報源から取得できなかった想定で)すべてunavailableとする
    const topics = [makeTopicInput({ genre: genres[0] })]
    const unavailableGenres = genres.slice(1)
    const article = assembleArticle('entertainment', '2026-09-15', topics, unavailableGenres)

    const covered = new Set([...article.topics.map((t) => t.genre), ...(article.unavailableGenres ?? [])])
    expect(covered).toEqual(new Set(genres))
  })
})

// 仕様: specs/trend-digest/article-detail/design.md「前提: 記事データの形式」(Topic.trend)、
// specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-10
describe('assembleArticle - 選定時の継続度・注目度の情報(trend)が記事のtopicに保存される', () => {
  it('入力のtrend(継続度ラベル・注目度ラベル・継続日数・継続開始日・報告回数・地域)がそのままtopic.trendに入る', () => {
    const trend = makeTrend({ durationLabel: 'highly-talked', heatLabel: 'low', reportCount: 3, originRegion: null, currentRegions: [] })
    const article = assembleArticle('entertainment', '2026-09-15', [makeTopicInput({ trend })], [])
    expect(article.topics[0].trend).toEqual(trend)
  })

  it('並び替え後も各topicが自分のtrendを保つ', () => {
    const anime = makeTopicInput({ genre: 'anime', trend: makeTrend({ durationLabel: 'emerging' }) })
    const music = makeTopicInput({ genre: 'music', trend: makeTrend({ durationLabel: 'pre-trend' }) })
    const article = assembleArticle('entertainment', '2026-09-15', [anime, music], [])
    expect(article.topics.map((t) => t.trend?.durationLabel)).toEqual(['pre-trend', 'emerging'])
  })

  it('組み立てた記事がparseArticleの検証(trendを含む)を通る', () => {
    const article = assembleArticle('entertainment', '2026-09-15', [makeTopicInput()], GENRE_ORDER.entertainment.filter((g) => g !== 'music'))
    expect(() => parseArticle(JSON.parse(JSON.stringify(article)), '2026-09-15-entertainment.json')).not.toThrow()
  })
})

describe('toTopicTrend - 選定結果(SelectedTopic)から記事のtrendを取り出す', () => {
  it('trend-historyの判定結果と地域情報だけを取り出す(掲載実績や本文など記事に不要な値は含めない)', () => {
    const selected = {
      genre: 'music',
      title: '対象作品A',
      sourceName: 'Oricon',
      sourceUrl: 'https://example.com/a',
      method: 'fixed-list',
      strength: 90,
      rank: 10,
      originRegion: '日本',
      currentRegions: ['日本'],
      strengthJapan: null,
      strengthOverseas: null,
      meetsCriteria: true,
      durationLabel: 'emerging',
      heatLabel: 'normal',
      continuationDays: 8,
      continuationStartDate: '2026-09-07',
      reportCount: 1,
      lastPublishedDurationLabel: null,
      lastPublishedBody: null,
    } as SelectedTopic
    expect(toTopicTrend(selected)).toEqual({
      durationLabel: 'emerging',
      heatLabel: 'normal',
      continuationDays: 8,
      continuationStartDate: '2026-09-07',
      reportCount: 1,
      originRegion: '日本',
      currentRegions: ['日本'],
    })
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#掲載実績の追跡-14
describe('assembleArticle - 実データの記事からtrend-historyの直近掲載時の継続度ラベルが埋まる', () => {
  it('assembleArticleで組み立てた記事をarticlesDirに置くと、collectPublishRecordsのlastPublishedDurationLabelが記事のtrend.durationLabelになる', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'assemble-article-'))
    try {
      const article = assembleArticle(
        'entertainment',
        '2026-09-15',
        [makeTopicInput({ title: '新曲A', trend: makeTrend({ durationLabel: 'emerging' }) })],
        GENRE_ORDER.entertainment.filter((g) => g !== 'music')
      )
      fs.writeFileSync(path.join(dir, `${article.id}.json`), JSON.stringify(article))
      const record = collectPublishRecords(dir).get(normalizeTitle('新曲A'))
      expect(record?.lastPublishedDurationLabel).toBe('emerging')
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
