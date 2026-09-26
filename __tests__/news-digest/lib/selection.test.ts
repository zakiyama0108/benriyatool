import { describe, it, expect } from 'vitest'
import { normalizeUrl, excludeAlreadyPublished, selectWeeklyTopics } from '../../../app/news-digest/lib/selection'
import type { Candidate, JudgedCandidate } from '../../../app/news-digest/lib/candidateTypes'
import type { Criteria } from '../../../app/news-digest/lib/watchlistTypes'

const criteria: Criteria = {
  weeklyTopicCountMax: { general: 3, business: 2, kanagawa: 1, childcare: 1 },
  minCorroboratingSources: 2,
}

function baseCandidate(overrides: Partial<Candidate>): Candidate {
  return {
    sourceId: 'nhk-news-web',
    sourceName: 'NHK NEWS WEB(政治・国際)',
    category: 'general',
    heading: 'テスト見出し',
    url: 'https://example.com/a',
    publishedAt: '2026-09-10T00:00:00Z',
    ...overrides,
  }
}

function judged(overrides: Partial<JudgedCandidate>): JudgedCandidate {
  return { ...baseCandidate(overrides), meetsCriteria: true, corroboratingSources: ['NHK NEWS WEB(政治・国際)', '共同通信'], ...overrides }
}

// 仕様: specs/news-digest/content-selection/requirements.md#掲載済み記事の再掲抑制-8、specs/news-digest/content-selection/design.md#掲載済み記事を除外する処理(決定的なコード)
describe('掲載済み記事の再掲抑制 - 過去に掲載した記事と元URLが一致する候補は当該週の採用候補から除外する', () => {
  it('末尾スラッシュ・クエリ文字列・ホスト名の大文字小文字が異なっていても、正規化後に一致すれば除外されること', () => {
    const candidates = [
      baseCandidate({ url: 'https://EXAMPLE.com/news/a/?utm_source=x' }),
      baseCandidate({ url: 'https://example.com/news/b' }),
    ]
    const publishedUrls = new Set(['https://example.com/news/a/'])

    const result = excludeAlreadyPublished(candidates, publishedUrls)

    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://example.com/news/b')
  })

  it('掲載済みURL集合に含まれない候補はすべて残ること', () => {
    const candidates = [baseCandidate({ url: 'https://example.com/news/c' })]
    expect(excludeAlreadyPublished(candidates, new Set(['https://example.com/news/other']))).toHaveLength(1)
  })
})

describe('URLの正規化 - ホスト名の小文字化・クエリ文字列とフラグメントの除去・末尾スラッシュの統一を行う', () => {
  it('ホスト名を小文字化し、クエリ文字列・フラグメント・末尾スラッシュを取り除いた形に揃えること', () => {
    expect(normalizeUrl('https://EXAMPLE.com/News/A/?ref=top#section')).toBe('https://example.com/News/A')
  })

  it('URLとして解釈できない文字列は、誤って除外しないようそのまま返すこと', () => {
    expect(normalizeUrl('not a url')).toBe('not a url')
  })
})

// 仕様: specs/news-digest/content-selection/requirements.md#採用基準(カテゴリごとの定量判定)-4、specs/news-digest/content-selection/requirements.md#1週あたりの掲載件数-6、specs/news-digest/content-selection/requirements.md#1週あたりの掲載件数-7
describe('総合・経済/ビジネスの採用基準判定 - 2社以上の裏付けがある候補のみを公開日時が新しい順に上限件数まで採用する', () => {
  it('総合カテゴリで基準を満たす候補が上限3件を超える場合、公開日時が新しい順に3件へ絞られること', () => {
    const candidates = [
      judged({ category: 'general', heading: 'A(最古)', publishedAt: '2026-09-08T00:00:00Z' }),
      judged({ category: 'general', heading: 'B', publishedAt: '2026-09-10T00:00:00Z' }),
      judged({ category: 'general', heading: 'C(最新)', publishedAt: '2026-09-12T00:00:00Z' }),
      judged({ category: 'general', heading: 'D', publishedAt: '2026-09-11T00:00:00Z' }),
    ]

    const result = selectWeeklyTopics(candidates, criteria)

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('unreachable')
    expect(result.topics.map((t) => t.heading)).toEqual(['C(最新)', 'D', 'B'])
  })

  it('経済・ビジネスカテゴリは上限2件までに絞られること', () => {
    const candidates = [
      judged({ category: 'business', heading: 'E', publishedAt: '2026-09-08T00:00:00Z' }),
      judged({ category: 'business', heading: 'F', publishedAt: '2026-09-12T00:00:00Z' }),
      judged({ category: 'business', heading: 'G', publishedAt: '2026-09-10T00:00:00Z' }),
    ]

    const result = selectWeeklyTopics(candidates, criteria)

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('unreachable')
    expect(result.topics.map((t) => t.heading)).toEqual(['F', 'G'])
  })

  it('基準を満たす候補が0件のカテゴリは、そのカテゴリの掲載なしとして返ること(架空の話題を作らない)', () => {
    const candidates = [
      judged({ category: 'general', meetsCriteria: false, corroboratingSources: ['NHK NEWS WEB(政治・国際)'] }),
      judged({ category: 'business', heading: '経済トピック' }),
    ]

    const result = selectWeeklyTopics(candidates, criteria)

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('unreachable')
    expect(result.topics.some((t) => t.category === 'general')).toBe(false)
  })
})

// 仕様: specs/news-digest/content-selection/requirements.md#採用基準(カテゴリごとの定量判定)-5、specs/news-digest/content-selection/design.md#1週分のトピックを選び出す処理(決定的なコード)
describe('神奈川ローカル・育児の専用枠 - エージェントが選んだ1件をそのまま採用し、基準未達の場合はその旨を記録する', () => {
  it('専用枠の候補が[4]の基準(2社以上の裏付け)も満たす場合、belowCriteriaがfalseのまま採用されること', () => {
    const candidates = [judged({ category: 'kanagawa', heading: '神奈川の重要トピック', meetsCriteria: true })]

    const result = selectWeeklyTopics(candidates, criteria)

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('unreachable')
    expect(result.topics).toEqual([expect.objectContaining({ heading: '神奈川の重要トピック', belowCriteria: false })])
  })

  it('専用枠の候補が基準未達(裏付け1社以下)の場合、belowCriteria: trueとなり乖離内容がbelowCriteriaReasonに設定されること', () => {
    const candidates = [
      judged({ category: 'childcare', heading: '育児の重要トピック', meetsCriteria: false, corroboratingSources: ['こども家庭庁'] }),
    ]

    const result = selectWeeklyTopics(candidates, criteria)

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('unreachable')
    expect(result.topics[0]).toMatchObject({ belowCriteria: true, belowCriteriaReason: '裏付けメディアが1社(基準2社)' })
  })

  it('専用枠に候補が1件もない週は、そのカテゴリの掲載なしとなること', () => {
    const candidates = [judged({ category: 'general' })]

    const result = selectWeeklyTopics(candidates, criteria)

    expect(result.status).toBe('ok')
    if (result.status !== 'ok') throw new Error('unreachable')
    expect(result.topics.some((t) => t.category === 'kanagawa')).toBe(false)
  })
})

// 仕様: specs/news-digest/weekly-publish/requirements.md#掲載件数の保証-1
describe('全カテゴリが掲載なしの週の扱い - 候補不足によりスキップされること', () => {
  it('全カテゴリで採用できる候補が1件もない場合、status: skippedが返ること', () => {
    const result = selectWeeklyTopics([], criteria)
    expect(result.status).toBe('skipped')
    if (result.status !== 'skipped') throw new Error('unreachable')
    expect(typeof result.reason).toBe('string')
  })
})
