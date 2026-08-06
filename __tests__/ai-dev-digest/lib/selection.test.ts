import { describe, it, expect } from 'vitest'
import { meetsCriteria, describeShortfall, selectDailyTopics, isTopicExcluded } from '../../../app/ai-dev-digest/lib/selection'
import type { Candidate } from '../../../app/ai-dev-digest/lib/candidateTypes'
import type { Criteria } from '../../../app/ai-dev-digest/lib/watchlistTypes'

const criteria: Criteria = {
  dailyTopicCount: { min: 3, max: 5 },
  youtubeRecentVideoWindow: 10,
  youtubeAboveAverageRatio: 1.2,
  qiitaMinLikes: 30,
  zennMinLikes: 30,
  topicExcludeKeywords: [],
}

function baseCandidate(overrides: Partial<Candidate>): Candidate {
  return {
    sourceId: 'anthropic',
    sourceName: 'Anthropic',
    sourceType: 'official',
    heading: 'テストタイトル',
    url: 'https://example.com/a',
    publishedAt: '2026-08-01T00:00:00Z',
    metricValue: 0,
    ...overrides,
  }
}

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#採用基準(種別ごとの定量判定)-4
describe('採用基準の判定 - 公式組織の新着投稿は原則すべて採用候補にする', () => {
  it('公式組織(official)の候補は、数値に関わらず常に基準を満たすこと', () => {
    const candidate = baseCandidate({ sourceType: 'official', metricValue: 0 })
    expect(meetsCriteria(candidate, criteria)).toBe(true)
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#採用基準(種別ごとの定量判定)-6
describe('採用基準の判定 - Simon Willisonの個人ブログの新着は原則採用候補にする', () => {
  it('個人ブログ(individual-blog)の候補は、数値に関わらず常に基準を満たすこと', () => {
    const candidate = baseCandidate({ sourceType: 'individual-blog', sourceName: 'Simon Willison', metricValue: 0 })
    expect(meetsCriteria(candidate, criteria)).toBe(true)
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#採用基準(種別ごとの定量判定)-5
describe('採用基準の判定 - 個人YouTubeはそのチャンネルの直近平均再生回数を明確に上回る場合のみ採用候補にする', () => {
  it('直近平均×倍率(1.2倍)をちょうど上回る再生回数のとき、基準を満たすこと', () => {
    const candidate = baseCandidate({ sourceType: 'individual-youtube', metricValue: 1201, recentAverageViews: 1000 })
    expect(meetsCriteria(candidate, criteria)).toBe(true)
  })

  it('直近平均×倍率(1.2倍)ちょうどのとき(上回っていない)、基準を満たさないこと', () => {
    const candidate = baseCandidate({ sourceType: 'individual-youtube', metricValue: 1200, recentAverageViews: 1000 })
    expect(meetsCriteria(candidate, criteria)).toBe(false)
  })

  it('直近平均を下回る再生回数のとき、基準を満たさないこと', () => {
    const candidate = baseCandidate({ sourceType: 'individual-youtube', metricValue: 500, recentAverageViews: 1000 })
    expect(meetsCriteria(candidate, criteria)).toBe(false)
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#採用基準(種別ごとの定量判定)-7
describe('採用基準の判定 - Qiitaの新着記事はいいね数30以上を採用候補にする', () => {
  it('いいね数がちょうど30件のとき、基準を満たすこと', () => {
    const candidate = baseCandidate({ sourceType: 'qiita', metricValue: 30 })
    expect(meetsCriteria(candidate, criteria)).toBe(true)
  })

  it('いいね数が29件(閾値未満)のとき、基準を満たさないこと', () => {
    const candidate = baseCandidate({ sourceType: 'qiita', metricValue: 29 })
    expect(meetsCriteria(candidate, criteria)).toBe(false)
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#採用基準(種別ごとの定量判定)-8
describe('採用基準の判定 - Zennの新着記事は公開ページのいいね数30以上を採用候補にする', () => {
  it('いいね数がちょうど30件のとき、基準を満たすこと', () => {
    const candidate = baseCandidate({ sourceType: 'zenn', metricValue: 30 })
    expect(meetsCriteria(candidate, criteria)).toBe(true)
  })

  it('いいね数が29件(閾値未満)のとき、基準を満たさないこと', () => {
    const candidate = baseCandidate({ sourceType: 'zenn', metricValue: 29 })
    expect(meetsCriteria(candidate, criteria)).toBe(false)
  })
})

// 仕様: specs/ai-dev-digest/content-selection/design.md#採用基準を判定する処理
describe('基準からの乖離内容の文言生成 - 基準を満たさない候補について、どれだけ届いていないかを説明文にする', () => {
  it('Qiitaでいいね数18件・基準30件のとき、「いいね数18件(基準30件に12件不足)」のような乖離内容になること(article-detail/design.mdの例文自体は算術上の誤記のため、正しい差分値で検証する)', () => {
    const candidate = baseCandidate({ sourceType: 'qiita', metricValue: 18 })
    expect(describeShortfall(candidate, criteria)).toBe('いいね数18件(基準30件に12件不足)')
  })

  it('Zennでいいね数10件・基準30件のとき、「いいね数10件(基準30件に20件不足)」のような乖離内容になること', () => {
    const candidate = baseCandidate({ sourceType: 'zenn', metricValue: 10 })
    expect(describeShortfall(candidate, criteria)).toBe('いいね数10件(基準30件に20件不足)')
  })

  it('個人YouTubeで再生回数500回・基準(直近平均1000×1.2倍=1200回)のとき、乖離内容に再生回数と基準値が含まれること', () => {
    const candidate = baseCandidate({ sourceType: 'individual-youtube', metricValue: 500, recentAverageViews: 1000 })
    expect(describeShortfall(candidate, criteria)).toBe('再生回数500回(基準1200回に700回不足)')
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#1日の掲載件数-9、specs/ai-dev-digest/content-selection/requirements.md#1日の掲載件数-10、specs/ai-dev-digest/content-selection/design.md#1日分のトピックを選び出す処理
describe('1日分のトピック選定 - 採用基準を満たす候補数に応じて3〜5件を選び出し、不足時は基準未達候補で補う', () => {
  it('基準を満たす候補が3〜5件(ここでは4件)のとき、そのまま全件採用されること', () => {
    const candidates: Candidate[] = ['a', 'b', 'c', 'd'].map((label) =>
      baseCandidate({ sourceId: label, heading: `見出し${label}`, sourceType: 'official' })
    )
    const result = selectDailyTopics(candidates, criteria)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.topics).toHaveLength(4)
      expect(result.topics.every((t) => !t.belowCriteria)).toBe(true)
    }
  })

  it('基準を満たす候補が6件(上限超過)のとき、種別ができるだけ偏らないように分散させながら新しい順で5件に絞られること', () => {
    const official = [
      baseCandidate({ sourceId: 'o1', heading: 'o1', sourceType: 'official', publishedAt: '2026-08-06T03:00:00Z' }),
      baseCandidate({ sourceId: 'o2', heading: 'o2', sourceType: 'official', publishedAt: '2026-08-05T00:00:00Z' }),
      baseCandidate({ sourceId: 'o3', heading: 'o3', sourceType: 'official', publishedAt: '2026-08-04T00:00:00Z' }),
    ]
    const qiita = [
      baseCandidate({ sourceId: 'q1', heading: 'q1', sourceType: 'qiita', metricValue: 40, publishedAt: '2026-08-06T01:00:00Z' }),
      baseCandidate({ sourceId: 'q2', heading: 'q2', sourceType: 'qiita', metricValue: 40, publishedAt: '2026-08-03T00:00:00Z' }),
      baseCandidate({ sourceId: 'q3', heading: 'q3', sourceType: 'qiita', metricValue: 40, publishedAt: '2026-08-02T00:00:00Z' }),
    ]
    const result = selectDailyTopics([...official, ...qiita], criteria)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.topics).toHaveLength(5)
      const ids = result.topics.map((t) => t.sourceId)
      // 直近で最も古いqiita候補(q3)は選ばれず、他5件(両種別を含む)が選ばれること
      expect(ids).not.toContain('q3')
      expect(ids).toEqual(expect.arrayContaining(['o1', 'o2', 'o3', 'q1', 'q2']))
      const sourceTypesUsed = new Set(result.topics.map((t) => t.sourceType))
      expect(sourceTypesUsed.size).toBeGreaterThan(1)
    }
  })

  it('基準を満たす候補が2件(3件未満)のとき、基準未達候補のうち乖離が小さいものから補い3件になること(補った分はbelowCriteriaがtrueになる)', () => {
    const meeting = [
      baseCandidate({ sourceId: 'o1', heading: 'o1', sourceType: 'official' }),
      baseCandidate({ sourceId: 'o2', heading: 'o2', sourceType: 'official' }),
    ]
    const notMeeting = [
      baseCandidate({ sourceId: 'q-near', heading: 'q-near', sourceType: 'qiita', metricValue: 25 }), // 基準30に5件不足
      baseCandidate({ sourceId: 'q-far', heading: 'q-far', sourceType: 'qiita', metricValue: 5 }), // 基準30に25件不足
    ]
    const result = selectDailyTopics([...meeting, ...notMeeting], criteria)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.topics).toHaveLength(3)
      const supplemented = result.topics.find((t) => t.sourceId === 'q-near')
      expect(supplemented?.belowCriteria).toBe(true)
      expect(supplemented?.shortfallReason).toBe('いいね数25件(基準30件に5件不足)')
      expect(result.topics.some((t) => t.sourceId === 'q-far')).toBe(false)
    }
  })

  it('基準を満たす候補・満たさない候補を合わせても3件未満(ここでは2件)だが1件以上あるとき、その件数のまま採用されbelowCriteriaがtrueになること', () => {
    const candidates = [
      baseCandidate({ sourceId: 'q1', heading: 'q1', sourceType: 'qiita', metricValue: 10 }),
      baseCandidate({ sourceId: 'q2', heading: 'q2', sourceType: 'qiita', metricValue: 5 }),
    ]
    const result = selectDailyTopics(candidates, criteria)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.topics).toHaveLength(2)
      expect(result.topics.every((t) => t.belowCriteria)).toBe(true)
    }
  })

  it('収集した候補が実在するものも含め1件もないとき、候補不足によるスキップ結果になること', () => {
    const result = selectDailyTopics([], criteria)
    expect(result.status).toBe('skipped')
  })
})

// 仕様: specs/ai-dev-digest/content-selection/requirements.md#話題の関連性(種別を問わない横断フィルター)-12、specs/ai-dev-digest/content-selection/design.md#話題の関連性フィルタを適用する処理(決定的なコード。2026-08第2次改定)
describe('話題の関連性フィルタ - 他の採用基準を満たしていても、原文タイトルが除外キーワードに該当する候補は候補から除外する', () => {
  const criteriaWithExcludeKeywords: Criteria = {
    ...criteria,
    topicExcludeKeywords: ['医療', 'ヘルスケア', 'healthcare', 'medical'],
  }

  it('原文タイトルに除外キーワード(日本語)を含む候補は除外されること', () => {
    const candidate = baseCandidate({ heading: 'AIによる医療診断支援の最新動向', sourceType: 'official' })
    expect(isTopicExcluded(candidate, criteriaWithExcludeKeywords)).toBe(true)
  })

  it('原文タイトルに除外キーワード(英語、大文字小文字混在)を含む候補は除外されること', () => {
    const candidate = baseCandidate({ heading: 'How AI Transforms Healthcare Diagnostics', sourceType: 'official' })
    expect(isTopicExcluded(candidate, criteriaWithExcludeKeywords)).toBe(true)
  })

  it('原文タイトルが除外キーワードを含まない候補は除外されないこと', () => {
    const candidate = baseCandidate({ heading: '新しいコーディングエージェントの使い方', sourceType: 'official' })
    expect(isTopicExcluded(candidate, criteriaWithExcludeKeywords)).toBe(false)
  })

  it('topicExcludeKeywordsが空配列のとき、どの候補も除外されないこと', () => {
    const candidate = baseCandidate({ heading: 'AIによる医療診断支援の最新動向', sourceType: 'official' })
    expect(isTopicExcluded(candidate, criteria)).toBe(false)
  })

  it('話題除外に該当する候補は、他の採用基準(公式組織は無条件採用)を満たしていても選定結果から除外されること', () => {
    const excluded = baseCandidate({ sourceId: 'medical', heading: 'AIによる医療診断支援の最新動向', sourceType: 'official' })
    const others = ['a', 'b', 'c'].map((label) =>
      baseCandidate({ sourceId: label, heading: `見出し${label}`, sourceType: 'official' })
    )
    const result = selectDailyTopics([excluded, ...others], criteriaWithExcludeKeywords)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.topics.some((t) => t.sourceId === 'medical')).toBe(false)
      expect(result.topics).toHaveLength(3)
    }
  })

  it('話題除外により残る候補が基準未達のみになっても、その候補で補われbelowCriteriaがtrueになること(除外候補は補充対象にもならない)', () => {
    const excluded = baseCandidate({ sourceId: 'medical', heading: 'AIによる医療診断支援の最新動向', sourceType: 'qiita', metricValue: 100 })
    const notMeeting = baseCandidate({ sourceId: 'q-near', heading: 'q-near', sourceType: 'qiita', metricValue: 25 })
    const result = selectDailyTopics([excluded, notMeeting], criteriaWithExcludeKeywords)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.topics).toHaveLength(1)
      expect(result.topics[0].sourceId).toBe('q-near')
      expect(result.topics[0].belowCriteria).toBe(true)
    }
  })

  it('収集した候補すべてが話題除外に該当し、実在する候補が残らないとき、候補不足によるスキップ結果になること', () => {
    const excluded = baseCandidate({ sourceId: 'medical', heading: 'AIによる医療診断支援の最新動向', sourceType: 'official' })
    const result = selectDailyTopics([excluded], criteriaWithExcludeKeywords)
    expect(result.status).toBe('skipped')
  })
})

// 仕様: specs/ai-dev-digest/daily-publish/requirements.md#掲載件数の保証-1
describe('日次公開における掲載件数の保証 - 基準未達の候補を含めても実在する候補が1件以上あれば記事公開をスキップしない', () => {
  it('基準を満たす候補が0件でも、実在する基準未達候補が1件あればスキップせずその1件を採用すること', () => {
    const result = selectDailyTopics([baseCandidate({ sourceId: 'q1', heading: 'q1', sourceType: 'qiita', metricValue: 1 })], criteria)
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.topics).toHaveLength(1)
      expect(result.topics[0].belowCriteria).toBe(true)
    }
  })

  it('実在する候補が1件もないときのみ、その日はスキップすること', () => {
    const result = selectDailyTopics([], criteria)
    expect(result.status).toBe('skipped')
  })
})
