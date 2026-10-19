import { describe, it, expect } from 'vitest'
import { buildHistoryLogLines } from '../../../app/trend-digest/lib/historyLog'

// 仕様: specs/trend-digest/trend-history/design.md「ログ」
describe('履歴の判定結果のログ出力(buildHistoryLogLines) - 観測件数・ラベルの分布・注目度の判定方法・地域不明件数を記録する', () => {
  it('観測ログを書き出した実行日・編・記録した観測件数が含まれること', () => {
    const lines = buildHistoryLogLines({
      date: '2026-09-15',
      edition: 'entertainment',
      writtenObservationCount: 42,
      durationLabelCounts: {},
      heatLabelCounts: {},
      heatBasisByGenre: new Map(),
      unknownOriginRegionCount: 0,
    })
    expect(lines.some((l) => l.includes('2026-09-15-entertainment.json') && l.includes('42件'))).toBe(true)
  })

  it('全話題の継続度ラベルごとの件数が含まれること', () => {
    const lines = buildHistoryLogLines({
      date: '2026-09-15',
      edition: 'entertainment',
      writtenObservationCount: 0,
      durationLabelCounts: { 'pre-trend': 3, emerging: 2, talked: 1, 'highly-talked': 1 },
      heatLabelCounts: {},
      heatBasisByGenre: new Map(),
      unknownOriginRegionCount: 0,
    })
    const line = lines.find((l) => l.includes('継続度ラベルの件数'))
    expect(line).toContain('"pre-trend":3')
    expect(line).toContain('"emerging":2')
    expect(line).toContain('"talked":1')
    expect(line).toContain('"highly-talked":1')
  })

  it('注目度ラベルごとの件数が含まれること', () => {
    const lines = buildHistoryLogLines({
      date: '2026-09-15',
      edition: 'entertainment',
      writtenObservationCount: 0,
      durationLabelCounts: {},
      heatLabelCounts: { high: 2, normal: 5, low: 1 },
      heatBasisByGenre: new Map(),
      unknownOriginRegionCount: 0,
    })
    const line = lines.find((l) => l.includes('注目度ラベルの件数'))
    expect(line).toContain('"high":2')
    expect(line).toContain('"normal":5')
    expect(line).toContain('"low":1')
  })

  it('ジャンルごとに注目度をどちらの方法(過去の分布/情報源での位置)で決めたかが含まれること', () => {
    const lines = buildHistoryLogLines({
      date: '2026-09-15',
      edition: 'entertainment',
      writtenObservationCount: 0,
      durationLabelCounts: {},
      heatLabelCounts: {},
      heatBasisByGenre: new Map([
        ['music', new Set(['source-position'])],
        ['anime', new Set(['distribution', 'source-position'])],
      ]),
      unknownOriginRegionCount: 0,
    })
    expect(lines.some((l) => l.includes('music') && l.includes('source-position'))).toBe(true)
    expect(lines.some((l) => l.includes('anime') && l.includes('distribution') && l.includes('source-position'))).toBe(true)
  })

  it('地域情報が「不明」のまま記録された話題の件数が含まれること', () => {
    const lines = buildHistoryLogLines({
      date: '2026-09-15',
      edition: 'entertainment',
      writtenObservationCount: 0,
      durationLabelCounts: {},
      heatLabelCounts: {},
      heatBasisByGenre: new Map(),
      unknownOriginRegionCount: 7,
    })
    expect(lines.some((l) => l.includes('発祥地域') && l.includes('7件'))).toBe(true)
  })
})
