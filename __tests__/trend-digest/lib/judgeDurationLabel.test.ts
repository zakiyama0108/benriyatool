import { describe, it, expect } from 'vitest'
import { judgeDurationLabel } from '../../../app/trend-digest/lib/judgeDurationLabel'
import { DURATION_LABEL_ORDER, HEAT_LABEL_ORDER } from '../../../app/trend-digest/lib/historyTypes'
import type { HistoryCriteria, HistoryJudgement } from '../../../app/trend-digest/lib/historyTypes'

const criteria: HistoryCriteria = {
  emergingMinDays: 14,
  talkedMinDays: 30,
  highlyTalkedMinDays: 90,
  maxObservationsPerSource: 30,
  heatMinObservationRuns: 12,
  heatRankHigh: 3,
  heatRankNormal: 10,
  heatSourcesHigh: 5,
  heatSourcesNormal: 3,
}

// 仕様: specs/trend-digest/trend-history/requirements.md#継続度ラベル-2、specs/trend-digest/trend-history/requirements.md#継続度ラベル-3、specs/trend-digest/trend-history/requirements.md#継続度ラベル-4
describe('継続度ラベルの判定(judgeDurationLabel) - 途切れずに検知され続けている日数から4段階を決める', () => {
  it('継続日数が0日・13日(emergingMinDays未満)は「流行前」になること', () => {
    expect(judgeDurationLabel(0, criteria)).toBe('pre-trend')
    expect(judgeDurationLabel(13, criteria)).toBe('pre-trend')
  })

  it('継続日数が14日・29日(emergingMinDays以上talkedMinDays未満)は「注目され始め」になること', () => {
    expect(judgeDurationLabel(14, criteria)).toBe('emerging')
    expect(judgeDurationLabel(29, criteria)).toBe('emerging')
  })

  it('継続日数が30日・89日(talkedMinDays以上highlyTalkedMinDays未満)は「話題」になること', () => {
    expect(judgeDurationLabel(30, criteria)).toBe('talked')
    expect(judgeDurationLabel(89, criteria)).toBe('talked')
  })

  it('継続日数が90日・それ以上(highlyTalkedMinDays以上)は「非常に話題」になること', () => {
    expect(judgeDurationLabel(90, criteria)).toBe('highly-talked')
    expect(judgeDurationLabel(365, criteria)).toBe('highly-talked')
  })
})

// 仕様: specs/trend-digest/trend-history/design.md「継続度ラベルを判定する処理」
describe('継続度ラベルの判定基準の外部化(judgeDurationLabel) - 日数の区切りはcriteria.jsonのhistoryから読み、コードに直書きしない', () => {
  it('emergingMinDaysを変更すると、同じ継続日数でも判定が変わること', () => {
    const loosened: HistoryCriteria = { ...criteria, emergingMinDays: 20 }
    expect(judgeDurationLabel(15, criteria)).toBe('emerging')
    expect(judgeDurationLabel(15, loosened)).toBe('pre-trend')
  })
})

// 仕様: specs/trend-digest/trend-history/design.md「履歴データの形式」
describe('ラベルの並び順の定数(DURATION_LABEL_ORDER・HEAT_LABEL_ORDER) - 並べ替えの比較に使うため強さの順で並ぶ', () => {
  it('DURATION_LABEL_ORDERが流行前<注目され始め<話題<非常に話題の順であること', () => {
    expect(DURATION_LABEL_ORDER['pre-trend']).toBeLessThan(DURATION_LABEL_ORDER.emerging)
    expect(DURATION_LABEL_ORDER.emerging).toBeLessThan(DURATION_LABEL_ORDER.talked)
    expect(DURATION_LABEL_ORDER.talked).toBeLessThan(DURATION_LABEL_ORDER['highly-talked'])
  })

  it('HEAT_LABEL_ORDERが低い<普通<高いの順であること', () => {
    expect(HEAT_LABEL_ORDER.low).toBeLessThan(HEAT_LABEL_ORDER.normal)
    expect(HEAT_LABEL_ORDER.normal).toBeLessThan(HEAT_LABEL_ORDER.high)
  })
})

// 仕様: specs/trend-digest/trend-history/requirements.md#継続度ラベル-7
describe('判定結果に掲載可否を持たせないこと(HistoryJudgement) - 掲載するかどうかの判断はcontent-selectionの責務のため', () => {
  it('HistoryJudgementが掲載可否(isPublishable相当)のフィールドを持たないこと', () => {
    const judgement: HistoryJudgement = {
      durationLabel: 'pre-trend',
      heatLabel: 'normal',
      heatBasis: 'source-position',
      continuationDays: 0,
      continuationStartDate: '2026-09-15',
      detectionCount: 1,
      publishedCount: 0,
      reportCount: 1,
      lastPublishedDurationLabel: null,
    }
    expect(Object.keys(judgement).sort()).toEqual(
      [
        'continuationDays',
        'continuationStartDate',
        'detectionCount',
        'durationLabel',
        'heatBasis',
        'heatLabel',
        'lastPublishedDurationLabel',
        'publishedCount',
        'reportCount',
      ].sort()
    )
  })
})
