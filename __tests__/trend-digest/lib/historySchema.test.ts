import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parseObservationLog, readObservationLogs } from '../../../app/trend-digest/lib/historySchema'

const MAX_OBSERVATIONS_PER_SOURCE = 30

function validObservation(overrides: Record<string, unknown> = {}) {
  return {
    genre: 'music',
    title: '新曲A',
    strength: 30,
    meetsCriteria: true,
    rank: 1,
    method: 'fixed-list',
    originRegion: null,
    currentRegions: [],
    strengthJapan: null,
    strengthOverseas: null,
    ...overrides,
  }
}

function validLog(overrides: Record<string, unknown> = {}) {
  return {
    date: '2026-09-15',
    edition: 'entertainment',
    observations: [validObservation()],
    ...overrides,
  }
}

// 仕様: specs/trend-digest/trend-history/design.md「バリデーション」
describe('観測ログのスキーマ検証(parseObservationLog) - 実行日・編・観測項目の形式を外部入力として検証する', () => {
  it('正しい形式のログはそのままパースされること', () => {
    const parsed = parseObservationLog(validLog(), '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)
    expect(parsed.date).toBe('2026-09-15')
    expect(parsed.edition).toBe('entertainment')
    expect(parsed.observations).toHaveLength(1)
  })

  it('observationsが0件のログは正常に読めること', () => {
    const parsed = parseObservationLog(validLog({ observations: [] }), '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)
    expect(parsed.observations).toEqual([])
  })

  it('dateがYYYY-MM-DD形式でない場合は例外になること', () => {
    expect(() =>
      parseObservationLog(validLog({ date: '2026/09/15' }), '2026/09/15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)
    ).toThrow()
  })

  it('editionが定義外の値の場合は例外になること', () => {
    expect(() =>
      parseObservationLog(validLog({ edition: 'sports' }), '2026-09-15-sports.json', MAX_OBSERVATIONS_PER_SOURCE)
    ).toThrow()
  })

  it('observationsが配列でない場合は例外になること', () => {
    expect(() =>
      parseObservationLog(validLog({ observations: {} }), '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)
    ).toThrow()
  })

  it('genreが定義外の値の場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ genre: 'not-a-genre' })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('titleが空文字の場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ title: '' })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('titleに制御文字(改行)が含まれる場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ title: '新曲A\n改行入り' })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('strengthが数値でない場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ strength: '30' })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('rankが0以下の場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ rank: 0 })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('rankが小数の場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ rank: 1.5 })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('rankがmaxObservationsPerSourceを超える場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ rank: MAX_OBSERVATIONS_PER_SOURCE + 1 })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('methodが定義外の値(hybridを含む)の場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ method: 'hybrid' })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('meetsCriteriaが真偽値でない場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ meetsCriteria: 'true' })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('ファイル名と中身のdate/editionが食い違う場合は例外になること', () => {
    expect(() => parseObservationLog(validLog(), '2026-09-16-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
    expect(() => parseObservationLog(validLog(), '2026-09-15-culture-lifestyle.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('同じファイル内に同じ正規化タイトルかつ同じ選定方式の観測が2件あると例外になること', () => {
    const log = validLog({
      observations: [
        validObservation({ title: '新曲A' }),
        validObservation({ title: ' 新曲A ', rank: 2, strength: 29 }),
      ],
    })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('正規化タイトルが同じでも選定方式が違う観測2件は例外にならないこと(固定リストとWebSearch双方で取れた場合)', () => {
    const log = validLog({
      observations: [
        validObservation({ title: '新曲A', method: 'fixed-list', rank: 1 }),
        validObservation({ title: '新曲A', method: 'websearch', rank: null, strength: 3 }),
      ],
    })
    const parsed = parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)
    expect(parsed.observations).toHaveLength(2)
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#地域情報-15、specs/trend-digest/trend-history/requirements.md#地域情報-16
describe('観測ログの地域情報の検証(parseObservationLog) - 収集エージェント由来の自由文字列を外部入力として検証する', () => {
  it('originRegionがnullの場合は許容されること(不明)', () => {
    const log = validLog({ observations: [validObservation({ originRegion: null })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).not.toThrow()
  })

  it('originRegionが50文字を超える場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ originRegion: 'あ'.repeat(51) })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('originRegionが空文字の場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ originRegion: '' })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('originRegionに制御文字が含まれる場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ originRegion: '日本\n' })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('currentRegionsが空配列の場合は許容されること(不明)', () => {
    const log = validLog({ observations: [validObservation({ currentRegions: [] })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).not.toThrow()
  })

  it('currentRegionsの要素が50文字を超える場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ currentRegions: ['あ'.repeat(51)] })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('currentRegionsの要素が空文字の場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ currentRegions: [''] })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('currentRegionsの要素に制御文字が含まれる場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ currentRegions: ['日本\t'] })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('currentRegionsの要素数が11件以上の場合は例外になること', () => {
    const log = validLog({ observations: [validObservation({ currentRegions: Array.from({ length: 11 }, (_, i) => `地域${i}`) })] })
    expect(() => parseObservationLog(log, '2026-09-15-entertainment.json', MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })
})

// 仕様: specs/trend-digest/trend-history/design.md「エラーハンドリング」
describe('観測ログディレクトリの読み込み(readObservationLogs) - 運用開始直後・欠測週があっても例外にならない', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trend-history-schema-'))
  })

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('履歴ディレクトリが存在しない場合、空配列が返ること', () => {
    const logs = readObservationLogs(path.join(tmpDir, 'does-not-exist'), MAX_OBSERVATIONS_PER_SOURCE)
    expect(logs).toEqual([])
  })

  it('観測ログが1件もない場合、空配列が返ること', () => {
    expect(readObservationLogs(tmpDir, MAX_OBSERVATIONS_PER_SOURCE)).toEqual([])
  })

  it('複数の観測ログが実行日の昇順に並んで返ること', () => {
    fs.writeFileSync(path.join(tmpDir, '2026-09-15-entertainment.json'), JSON.stringify(validLog({ date: '2026-09-15' })))
    fs.writeFileSync(path.join(tmpDir, '2026-09-01-entertainment.json'), JSON.stringify(validLog({ date: '2026-09-01' })))
    const logs = readObservationLogs(tmpDir, MAX_OBSERVATIONS_PER_SOURCE)
    expect(logs.map((l) => l.date)).toEqual(['2026-09-01', '2026-09-15'])
  })

  it('スキーマ違反のファイルがあると例外になること', () => {
    fs.writeFileSync(path.join(tmpDir, '2026-09-15-entertainment.json'), JSON.stringify(validLog({ date: '2026-09-16' })))
    expect(() => readObservationLogs(tmpDir, MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })

  it('JSONとして読めないファイルがあると例外になること', () => {
    fs.writeFileSync(path.join(tmpDir, '2026-09-15-entertainment.json'), '{not valid json')
    expect(() => readObservationLogs(tmpDir, MAX_OBSERVATIONS_PER_SOURCE)).toThrow()
  })
})
