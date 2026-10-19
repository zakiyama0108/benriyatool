import { describe, it, expect } from 'vitest'
import { buildContinuityNote } from '../../../app/trend-digest/lib/continuityNote'
import type { SelectedTopic } from '../../../app/trend-digest/lib/candidateTypes'

function makeSelected(overrides: Partial<SelectedTopic> = {}): SelectedTopic {
  return {
    genre: 'music',
    title: '新曲A',
    sourceName: 'Oricon',
    sourceUrl: 'https://example.com/a',
    method: 'fixed-list',
    strength: 90,
    rank: 10,
    originRegion: '日本',
    currentRegions: ['日本', '北米'],
    strengthJapan: null,
    strengthOverseas: null,
    meetsCriteria: true,
    durationLabel: 'emerging',
    heatLabel: 'high',
    continuationDays: 8,
    continuationStartDate: '2026-09-07',
    reportCount: 1,
    lastPublishedDurationLabel: null,
    lastPublishedBody: null,
    ...overrides,
  }
}

// 仕様: specs/trend-digest/content-generation/requirements.md#エージェントの逸脱防止-6
// (design.md「見出し・本文を書く処理」手順7に対応)
describe('buildContinuityNote - プロンプトに渡す継続度・注目度の事実情報', () => {
  it('初掲載(報告回数1)の話題でも、継続度ラベル・注目度ラベル・継続日数・報告回数・地域を渡す', () => {
    const note = buildContinuityNote(makeSelected({ reportCount: 1 }))
    expect(note).toContain('注目され始め')
    expect(note).toContain('注目度 高い')
    expect(note).toContain('8日')
    expect(note).toContain('1回目')
    expect(note).toContain('日本')
    expect(note).toContain('北米')
  })

  it('初掲載の話題には続報向けの指示(前回本文・前回からの変化)を含めない', () => {
    const note = buildContinuityNote(makeSelected({ reportCount: 1 }))
    expect(note).not.toContain('前回掲載時の本文')
  })

  it('地域が不明(null・空配列)の場合は不明と明示し、地域を創作させない', () => {
    const note = buildContinuityNote(makeSelected({ originRegion: null, currentRegions: [] }))
    expect(note).toContain('不明')
  })

  it('続報(報告回数2回目以降)は事実情報に加えて、直近の継続度ラベルと前回の本文を渡す', () => {
    const note = buildContinuityNote(
      makeSelected({ reportCount: 3, lastPublishedDurationLabel: 'pre-trend', lastPublishedBody: '前回の本文です' })
    )
    expect(note).toContain('3回目')
    expect(note).toContain('流行前')
    expect(note).toContain('前回の本文です')
    expect(note).toContain('注目度 高い')
  })
})
