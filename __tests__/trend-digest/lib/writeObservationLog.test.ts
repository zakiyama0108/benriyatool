import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeObservationLog } from '../../../app/trend-digest/lib/writeObservationLog'
import type { Candidate } from '../../../app/trend-digest/lib/candidateTypes'
import type { ObservationLog } from '../../../app/trend-digest/lib/historyTypes'

const MAX_OBSERVATIONS_PER_SOURCE = 30

function candidate(overrides: Partial<Candidate>): Candidate {
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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trend-history-write-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function readWritten(date: string, edition: string): ObservationLog {
  return JSON.parse(fs.readFileSync(path.join(tmpDir, `${date}-${edition}.json`), 'utf8')) as ObservationLog
}

// 仕様: specs/trend-digest/trend-history/design.md「その回の観測を履歴に記録する処理」
describe('観測ログの書き出し(writeObservationLog) - その回の観測項目全件を1ファイルとして記録する', () => {
  it('観測項目一覧から<date>-<edition>.jsonが作られること', () => {
    writeObservationLog(tmpDir, '2026-09-15', 'entertainment', [candidate({})], MAX_OBSERVATIONS_PER_SOURCE)
    const written = readWritten('2026-09-15', 'entertainment')
    expect(written.date).toBe('2026-09-15')
    expect(written.edition).toBe('entertainment')
    expect(written.observations).toHaveLength(1)
  })

  it('観測項目0件でもobservationsが空のファイルが作られること', () => {
    writeObservationLog(tmpDir, '2026-09-15', 'entertainment', [], MAX_OBSERVATIONS_PER_SOURCE)
    const written = readWritten('2026-09-15', 'entertainment')
    expect(written.observations).toEqual([])
  })

  it('同名ファイルが既にある場合は上書きせず例外になること', () => {
    writeObservationLog(tmpDir, '2026-09-15', 'entertainment', [candidate({})], MAX_OBSERVATIONS_PER_SOURCE)
    expect(() =>
      writeObservationLog(tmpDir, '2026-09-15', 'entertainment', [candidate({ title: '別の曲' })], MAX_OBSERVATIONS_PER_SOURCE)
    ).toThrow()
    // 上書きされていないこと(元の内容がそのまま残ること)
    expect(readWritten('2026-09-15', 'entertainment').observations).toHaveLength(1)
  })

  it('固定リストジャンルの項目はrankが記録され、WebSearchジャンルの項目はrankがnullで記録されること', () => {
    writeObservationLog(
      tmpDir,
      '2026-09-15',
      'entertainment',
      [
        candidate({ title: '固定リスト作品', method: 'fixed-list', rank: 3 }),
        candidate({ title: 'WebSearch作品', method: 'websearch', rank: null, strength: 4, genre: 'sns-buzz' }),
      ],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    const written = readWritten('2026-09-15', 'entertainment')
    expect(written.observations.find((o) => o.title === '固定リスト作品')?.rank).toBe(3)
    expect(written.observations.find((o) => o.title === 'WebSearch作品')?.rank).toBeNull()
  })

  it('採用基準を満たしたかどうか(meetsCriteria)が項目ごとに記録されること', () => {
    writeObservationLog(
      tmpDir,
      '2026-09-15',
      'entertainment',
      [candidate({ title: '候補作品', meetsCriteria: true }), candidate({ title: '非候補作品', meetsCriteria: false, rank: 20 })],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    const written = readWritten('2026-09-15', 'entertainment')
    expect(written.observations.find((o) => o.title === '候補作品')?.meetsCriteria).toBe(true)
    expect(written.observations.find((o) => o.title === '非候補作品')?.meetsCriteria).toBe(false)
  })
})

// 仕様: specs/trend-digest/trend-history/design.md「その回の観測を履歴に記録する処理」手順3
describe('観測ログの書き出し時の重複統合 - 同じ回に同じ正規化タイトルの項目が複数のジャンル・情報源から取れた場合、選定方式ごとに1件だけ残す', () => {
  it('固定リストとWebSearchの双方で同じ正規化タイトルが取れた場合、方式ごとに1件ずつ計2件が残ること', () => {
    writeObservationLog(
      tmpDir,
      '2026-09-15',
      'entertainment',
      [
        candidate({ title: '呪術廻戦', genre: 'anime', method: 'fixed-list', rank: 2 }),
        candidate({ title: '呪術廻戦', genre: 'anime', method: 'websearch', rank: null, strength: 5 }),
      ],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    const written = readWritten('2026-09-15', 'entertainment')
    expect(written.observations).toHaveLength(2)
    expect(written.observations.map((o) => o.method).sort()).toEqual(['fixed-list', 'websearch'])
  })

  it('同じ回・同じ方式で順位を持つ観測が順位を持たない観測より優先されて残ること', () => {
    writeObservationLog(
      tmpDir,
      '2026-09-15',
      'entertainment',
      [
        candidate({ title: '重複作品', method: 'fixed-list', rank: 5, strength: 10 }),
        candidate({ title: '重複作品', method: 'fixed-list', rank: null, strength: 999 }),
      ],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    const written = readWritten('2026-09-15', 'entertainment')
    expect(written.observations).toHaveLength(1)
    expect(written.observations[0].rank).toBe(5)
  })

  it('順位を持つ観測が複数あれば最上位(数値が小さい)の1件が残ること', () => {
    writeObservationLog(
      tmpDir,
      '2026-09-15',
      'entertainment',
      [
        candidate({ title: '重複作品', method: 'fixed-list', rank: 8 }),
        candidate({ title: '重複作品', method: 'fixed-list', rank: 2 }),
      ],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    const written = readWritten('2026-09-15', 'entertainment')
    expect(written.observations).toHaveLength(1)
    expect(written.observations[0].rank).toBe(2)
  })

  it('順位を持つ観測がなければ強さが最大の1件が残ること', () => {
    writeObservationLog(
      tmpDir,
      '2026-09-15',
      'entertainment',
      [
        candidate({ title: '重複話題', genre: 'sns-buzz', method: 'websearch', rank: null, strength: 3 }),
        candidate({ title: '重複話題', genre: 'sns-buzz', method: 'websearch', rank: null, strength: 7 }),
      ],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    const written = readWritten('2026-09-15', 'entertainment')
    expect(written.observations).toHaveLength(1)
    expect(written.observations[0].strength).toBe(7)
  })
})

// 仕様: specs/trend-digest/trend-history/design.md「その回の観測を履歴に記録する処理」手順2
describe('観測ログの書き出し時の情報源ごとの記録上限 - 情報源ごとに上位maxObservationsPerSource件までに絞る', () => {
  it('同じ情報源から取れた項目数が上限を超える場合、上位(順位が小さい)から上限件数までに絞られること', () => {
    const items = Array.from({ length: 5 }, (_, i) =>
      candidate({ title: `作品${i + 1}`, sourceName: '同一情報源', rank: i + 1, strength: 30 - i })
    )
    writeObservationLog(tmpDir, '2026-09-15', 'entertainment', items, 3)
    const written = readWritten('2026-09-15', 'entertainment')
    expect(written.observations).toHaveLength(3)
    expect(written.observations.map((o) => o.title).sort()).toEqual(['作品1', '作品2', '作品3'])
  })
})

// 仕様: specs/trend-digest/trend-history/design.md「履歴データの形式」
describe('観測ログの強さ(history側の尺度)の設定 - content-selectionのstrength(100-順位)とは別の値を使う', () => {
  it('固定リストジャンルの項目の強さが(maxObservationsPerSource+1)-順位で設定されること(上位ほど大きい値になり、100-順位はそのまま使わない)', () => {
    writeObservationLog(
      tmpDir,
      '2026-09-15',
      'entertainment',
      [candidate({ title: '1位の作品', rank: 1, strength: 99 }), candidate({ title: '30位の作品', rank: 30, strength: 70 })],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    const written = readWritten('2026-09-15', 'entertainment')
    // (30+1)-1=30、(30+1)-30=1。content-selectionのstrength(100-順位=99, 70)とは異なる値
    expect(written.observations.find((o) => o.title === '1位の作品')?.strength).toBe(30)
    expect(written.observations.find((o) => o.title === '30位の作品')?.strength).toBe(1)
  })

  it('上限を超える順位の項目は記録対象外のため、負の強さが発生しないこと', () => {
    writeObservationLog(
      tmpDir,
      '2026-09-15',
      'entertainment',
      [candidate({ title: '上限内の作品', rank: 30, strength: 70 })],
      30
    )
    const written = readWritten('2026-09-15', 'entertainment')
    expect(written.observations[0].strength).toBeGreaterThanOrEqual(1)
  })

  it('WebSearchジャンルの項目の強さは、独立言及元の数(candidateのstrengthそのまま)が使われること', () => {
    writeObservationLog(
      tmpDir,
      '2026-09-15',
      'culture-lifestyle',
      [candidate({ title: '話題の店', genre: 'gourmet', method: 'websearch', rank: null, strength: 4 })],
      MAX_OBSERVATIONS_PER_SOURCE
    )
    const written = readWritten('2026-09-15', 'culture-lifestyle')
    expect(written.observations[0].strength).toBe(4)
  })
})
