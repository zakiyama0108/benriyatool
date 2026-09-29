import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeObservationLog } from '../../../app/trend-digest/lib/writeObservationLog'
import { readObservationLogs } from '../../../app/trend-digest/lib/historySchema'
import { aggregateHistory } from '../../../app/trend-digest/lib/aggregateHistory'
import { judgeDurationLabel } from '../../../app/trend-digest/lib/judgeDurationLabel'
import { judgeHeatLabel, buildGenreHeatStats } from '../../../app/trend-digest/lib/judgeHeatLabel'
import type { Candidate } from '../../../app/trend-digest/lib/candidateTypes'
import type { HistoryCriteria } from '../../../app/trend-digest/lib/historyTypes'

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

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return {
    genre: 'music',
    title: '新曲A',
    sourceName: '情報源A',
    sourceUrl: 'https://example.com/a',
    method: 'fixed-list',
    strength: 99,
    rank: 1,
    originRegion: null,
    currentRegions: [],
    strengthJapan: null,
    strengthOverseas: null,
    meetsCriteria: true,
    ...overrides,
  }
}

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trend-history-pipeline-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#継続度ラベル-1、specs/trend-digest/trend-history/design.md「エラーハンドリング」
describe('運用開始直後の挙動 - 履歴ディレクトリが存在しない・観測ログが1件もない状態から実行しても例外にならない', () => {
  it('初回実行で初めて観測された話題は、継続日数0の「流行前」、注目度は情報源での位置(実行回数不足)で決まること', () => {
    const historyDir = path.join(tmpDir, 'history') // まだ存在しないディレクトリ

    writeObservationLog(historyDir, '2026-09-15', 'entertainment', [candidate({ title: '新規話題', rank: 1 })], MAX_OBSERVATIONS_PER_SOURCE)

    const logs = readObservationLogs(historyDir, MAX_OBSERVATIONS_PER_SOURCE)
    const histories = aggregateHistory(logs)
    const genreStats = buildGenreHeatStats(logs)

    expect(histories).toHaveLength(1)
    const [history] = histories
    expect(judgeDurationLabel(history.continuationDays, criteria)).toBe('pre-trend')

    const stats = genreStats.get(history.latestGenre) ?? { runCount: 0, strengths: [] }
    const heat = judgeHeatLabel({ rank: history.latestRank, strength: history.latestStrength }, stats, criteria)
    expect(heat.basis).toBe('source-position')
  })
})

// 仕様: specs/trend-digest/trend-history/design.md「エラーハンドリング」
describe('欠測週(週次実行そのものの失敗)があっても判定がずれない', () => {
  it('欠測週があっても継続日数(日付の差)が変わらないこと', () => {
    const historyDir = path.join(tmpDir, 'history')
    writeObservationLog(historyDir, '2026-08-01', 'entertainment', [candidate({ title: '継続話題', rank: 1 })], MAX_OBSERVATIONS_PER_SOURCE)
    writeObservationLog(historyDir, '2026-08-08', 'entertainment', [candidate({ title: '継続話題', rank: 2 })], MAX_OBSERVATIONS_PER_SOURCE)
    // 2026-08-15は週次実行そのものが失敗し、観測ログが存在しない(欠測)
    writeObservationLog(historyDir, '2026-08-22', 'entertainment', [candidate({ title: '継続話題', rank: 3 })], MAX_OBSERVATIONS_PER_SOURCE)

    const logs = readObservationLogs(historyDir, MAX_OBSERVATIONS_PER_SOURCE)
    const [history] = aggregateHistory(logs)
    expect(history.continuationStartDate).toBe('2026-08-01')
    expect(history.continuationDays).toBe(21)
  })

  it('欠測週はそのジャンルの実行回数に数えられず、注目度の判定方法の切り替え(分布への移行)が早まらないこと', () => {
    const historyDir = path.join(tmpDir, 'history')
    const dates = ['2026-01-01', '2026-01-08', '2026-01-15', '2026-01-22', '2026-01-29', '2026-02-05']
    // 6回分の実行ログを書き出すが、うち3回は欠測(観測ログを書き出さない)。実際に記録されるのは3回のみ
    for (const [i, date] of dates.entries()) {
      if (i % 2 === 0) continue // 欠測週をシミュレート
      writeObservationLog(historyDir, date, 'entertainment', [candidate({ title: '定番曲', rank: 1 })], MAX_OBSERVATIONS_PER_SOURCE)
    }

    const logs = readObservationLogs(historyDir, MAX_OBSERVATIONS_PER_SOURCE)
    const genreStats = buildGenreHeatStats(logs)
    // 6週間分の日付があっても、実際に観測ログが存在するのは3回だけなので実行回数は3
    expect(genreStats.get('music')?.runCount).toBe(3)
  })
})
