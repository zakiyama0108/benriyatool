import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeObservationLog } from '../../../app/trend-digest/lib/writeObservationLog'
import { computeGenreHistoryReviewStats } from '../../../app/trend-digest/lib/sourceReviewHistoryStats'
import type { Candidate } from '../../../app/trend-digest/lib/candidateTypes'
import type { HistoryCriteria } from '../../../app/trend-digest/lib/historyTypes'
import type { Article } from '../../../app/trend-digest/lib/types'

const MAX_OBSERVATIONS_PER_SOURCE = 30

const criteria: HistoryCriteria = {
  emergingMinDays: 14,
  talkedMinDays: 30,
  highlyTalkedMinDays: 90,
  maxObservationsPerSource: MAX_OBSERVATIONS_PER_SOURCE,
  heatMinObservationRuns: 12,
  heatRankHigh: 3,
  heatRankNormal: 10,
  heatSourcesHigh: 5,
  heatSourcesNormal: 3,
}

// content-generationのbody文字数下限(160字)を満たすための共通ダミー本文
const DUMMY_BODY =
  'あるアーティストの新曲がストリーミングサービスの週間ランキングで急上昇した。SNSでの言及数も増加しており、幅広い層に支持されている様子がうかがえる。' +
  '追加の説明として、今回の話題は多くの利用者から関心を集めており、今後の展開にも注目が集まっている。追加の説明として、今回の話題は多くの利用者から関心を集めており、今後の展開にも注目が集まっている。'

function musicCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'music',
    title: '仮タイトル',
    sourceName: '情報源A',
    sourceUrl: 'https://example.com/a',
    method: 'fixed-list',
    strength: 90,
    rank: 1,
    originRegion: null,
    currentRegions: [],
    strengthJapan: null,
    strengthOverseas: null,
    meetsCriteria: true,
    ...overrides,
  }
}

function animeCandidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'anime',
    title: 'Anime X',
    sourceName: '情報源B',
    sourceUrl: 'https://example.com/b',
    method: 'fixed-list',
    strength: 90,
    rank: 1,
    originRegion: '日本',
    currentRegions: ['日本'],
    strengthJapan: null,
    strengthOverseas: null,
    meetsCriteria: true,
    ...overrides,
  }
}

function writeArticle(articlesDir: string, date: string, genre: string, sourceTitle: string): void {
  fs.mkdirSync(articlesDir, { recursive: true })
  const article: Article = {
    id: `${date}-entertainment`,
    edition: 'entertainment',
    date,
    topics: [
      {
        id: 'topic-1',
        genre: genre as Article['topics'][number]['genre'],
        heading: 'ダミー見出し',
        body: DUMMY_BODY,
        sourceTitle,
        sourceName: '情報源',
        sourceUrl: 'https://example.com/topic',
      },
    ],
  }
  fs.writeFileSync(path.join(articlesDir, `${date}-entertainment.json`), JSON.stringify(article, null, 2))
}

let tmpDir: string
let historyDir: string
let articlesDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'source-review-history-'))
  historyDir = path.join(tmpDir, 'history')
  articlesDir = path.join(tmpDir, 'articles')
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// 仕様: specs/trend-digest/source-review/design.md「見直しの材料を集める処理」手順3
// (集計結果は選定領域の見直し案の粒度・提示方法[9][10]の材料になるが、見直し案自体の作成はエージェントの推論に委ねるためTDD対象外。本テストは材料となる集計ロジックのみを検証する)
describe('観測ログからの継続度ラベル再集計・地域不明率の集計', () => {
  it('採用基準を満たした候補があるのに掲載した話題が「流行前」だった回数をジャンルごとに数えられること(候補が0件の回は数えない)', () => {
    // music: 08-04(候補あり・流行前→カウント対象)、08-11(候補なし→対象外。観測ログが非空でも
    // 候補0件は「候補が収集できている」と扱わない回帰確認)、08-18(候補あり・流行前→カウント対象)
    writeObservationLog(historyDir, '2026-08-04', 'entertainment', [musicCandidate({ title: 'Song A', meetsCriteria: true })], MAX_OBSERVATIONS_PER_SOURCE)
    writeObservationLog(historyDir, '2026-08-11', 'entertainment', [musicCandidate({ title: 'Song B', meetsCriteria: false })], MAX_OBSERVATIONS_PER_SOURCE)
    writeObservationLog(historyDir, '2026-08-18', 'entertainment', [musicCandidate({ title: 'Song C', meetsCriteria: true })], MAX_OBSERVATIONS_PER_SOURCE)

    writeArticle(articlesDir, '2026-08-04', 'music', 'Song A')
    writeArticle(articlesDir, '2026-08-11', 'music', 'Song B')
    writeArticle(articlesDir, '2026-08-18', 'music', 'Song C')

    const stats = computeGenreHistoryReviewStats(historyDir, articlesDir, '2026-08-01', criteria)
    const music = stats.find((s) => s.genre === 'music')

    expect(music?.preTrendDespiteCandidatesRounds).toBe(2)
  })

  it('候補は収集できているが、途切れず継続して観測され「流行前」を脱している話題は回数に数えないこと', () => {
    // anime: 07-21から08-25まで6週連続で検知され続ける話題(継続35日→「注目され始め」)。
    // 候補は毎回あるが、掲載された話題は流行前ではないためカウントされない
    const dates = ['2026-07-21', '2026-07-28', '2026-08-04', '2026-08-11', '2026-08-18', '2026-08-25']
    for (const date of dates) {
      writeObservationLog(historyDir, date, 'entertainment', [animeCandidate({ title: 'Anime X', meetsCriteria: true })], MAX_OBSERVATIONS_PER_SOURCE)
    }
    writeArticle(articlesDir, '2026-08-25', 'anime', 'Anime X')

    const stats = computeGenreHistoryReviewStats(historyDir, articlesDir, '2026-08-01', criteria)
    const anime = stats.find((s) => s.genre === 'anime')

    expect(anime?.preTrendDespiteCandidatesRounds).toBe(0)
  })

  it('発祥地域・主な流行地域が「不明」のまま記録された観測の割合をジャンルごとに算出できること', () => {
    // music: 集計期間内(2026-08-01以降)に3件の観測。うち2件が地域不明(null・空配列)
    writeObservationLog(
      historyDir,
      '2026-08-04',
      'entertainment',
      [musicCandidate({ title: 'Song A', meetsCriteria: true, originRegion: null, currentRegions: [] })],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    writeObservationLog(
      historyDir,
      '2026-08-11',
      'entertainment',
      [musicCandidate({ title: 'Song B', meetsCriteria: false, originRegion: null, currentRegions: [] })],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    writeObservationLog(
      historyDir,
      '2026-08-18',
      'entertainment',
      [musicCandidate({ title: 'Song C', meetsCriteria: true, originRegion: '日本', currentRegions: ['日本'] })],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    writeArticle(articlesDir, '2026-08-04', 'music', 'Song A')
    writeArticle(articlesDir, '2026-08-11', 'music', 'Song B')
    writeArticle(articlesDir, '2026-08-18', 'music', 'Song C')

    const stats = computeGenreHistoryReviewStats(historyDir, articlesDir, '2026-08-01', criteria)
    const music = stats.find((s) => s.genre === 'music')

    expect(music?.regionObservationCount).toBe(3)
    expect(music?.regionUnknownRatio).toBeCloseTo(2 / 3)
  })

  it('sinceDateより前の観測は地域不明率の集計対象から除外されること(継続日数の算出にのみ使う)', () => {
    writeObservationLog(
      historyDir,
      '2026-07-21',
      'entertainment',
      [musicCandidate({ title: 'Song Z', meetsCriteria: true, originRegion: null, currentRegions: [] })],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    writeObservationLog(
      historyDir,
      '2026-08-04',
      'entertainment',
      [musicCandidate({ title: 'Song Z', meetsCriteria: true, originRegion: '日本', currentRegions: ['日本'] })],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    writeArticle(articlesDir, '2026-08-04', 'music', 'Song Z')

    const stats = computeGenreHistoryReviewStats(historyDir, articlesDir, '2026-08-01', criteria)
    const music = stats.find((s) => s.genre === 'music')

    expect(music?.regionObservationCount).toBe(1)
    expect(music?.regionUnknownRatio).toBe(0)
  })

  it('観測ログ・記事データがまだ存在しない運用開始直後は、全ジャンルが回数0・割合0で返ること', () => {
    const stats = computeGenreHistoryReviewStats(historyDir, articlesDir, '2026-08-01', criteria)

    expect(stats.length).toBeGreaterThan(0)
    expect(stats.every((s) => s.preTrendDespiteCandidatesRounds === 0 && s.regionUnknownRatio === 0)).toBe(true)
  })
})
