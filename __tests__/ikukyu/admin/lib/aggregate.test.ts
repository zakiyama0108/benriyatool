import { describe, it, expect } from 'vitest'
import {
  chooseTrendUnit,
  buildTrend,
  aggregateByMode,
  aggregateSalary,
  aggregateAverages,
} from '../../../../app/ikukyu/admin/lib/aggregate'
import type { AdminRecord } from '../../../../app/ikukyu/admin/lib/types'

// テスト用に、必要なカラムだけ指定してレコードを組み立てるヘルパー
function rec(over: Partial<AdminRecord>): AdminRecord {
  return {
    id: 'x',
    created_at: '2026-07-15T02:00:00.000Z',
    mode: 'mama',
    monthly_salary: 300000,
    due_date: '2026-11-01',
    leave_start_date: null,
    leave_end_date: '2027-10-31',
    total_amount: 1000000,
    total_leave_days: 300,
    is_test: false,
    ...over,
  }
}

// 仕様: specs/ikukyu/admin/requirements.md#集計表示-1、specs/ikukyu/admin/requirements.md#表示の初期値・区切り-2
describe('【管理】推移の区切りの決定 - 選択期間の長さで日別/月別を選ぶ', () => {
  it('期間が未指定(全期間)のとき、月別になること', () => {
    expect(chooseTrendUnit(null, null)).toBe('month')
  })

  it('期間がおおむね2か月以内(62日以内)のとき、日別になること', () => {
    expect(chooseTrendUnit('2026-07-01', '2026-07-31')).toBe('day')
  })

  it('期間が2か月を大きく超えるとき、月別になること', () => {
    expect(chooseTrendUnit('2026-01-01', '2026-12-31')).toBe('month')
  })
})

// 仕様: specs/ikukyu/admin/requirements.md#集計表示-1
describe('【管理】利用件数の推移 - 保存日時ごとの件数を日別または月別に数える', () => {
  it('日別のとき、日本時間の同じ日の保存が1つの点にまとまり、日付の昇順で並ぶこと', () => {
    const records = [
      rec({ created_at: '2026-07-15T01:00:00.000Z' }), // JST 7/15
      rec({ created_at: '2026-07-15T20:00:00.000Z' }), // JST 7/16(UTC+9で日付繰り上がり)
      rec({ created_at: '2026-07-14T15:30:00.000Z' }), // JST 7/15
    ]
    const trend = buildTrend(records, 'day')
    expect(trend.unit).toBe('day')
    expect(trend.points).toEqual([
      { label: '2026-07-15', count: 2 },
      { label: '2026-07-16', count: 1 },
    ])
  })

  it('月別のとき、同じ月の保存が1つの点にまとまること', () => {
    const records = [
      rec({ created_at: '2026-07-15T02:00:00.000Z' }),
      rec({ created_at: '2026-08-01T02:00:00.000Z' }),
      rec({ created_at: '2026-07-20T02:00:00.000Z' }),
    ]
    const trend = buildTrend(records, 'month')
    expect(trend.points).toEqual([
      { label: '2026-07', count: 2 },
      { label: '2026-08', count: 1 },
    ])
  })
})

// 仕様: specs/ikukyu/admin/requirements.md#集計表示-2
describe('【管理】モード別の件数と比率 - ママ/パパそれぞれの件数と割合を出す', () => {
  it('ママ・パパの件数と、全体に占める比率が出ること', () => {
    const records = [rec({ mode: 'mama' }), rec({ mode: 'mama' }), rec({ mode: 'papa' }), rec({ mode: 'papa' })]
    const result = aggregateByMode(records)
    expect(result.mamaCount).toBe(2)
    expect(result.papaCount).toBe(2)
    expect(result.mamaRatio).toBeCloseTo(0.5)
    expect(result.papaRatio).toBeCloseTo(0.5)
  })

  it('対象が0件のとき、件数も比率も0になること(0での割り算をしない)', () => {
    const result = aggregateByMode([])
    expect(result.mamaCount).toBe(0)
    expect(result.mamaRatio).toBe(0)
    expect(result.papaRatio).toBe(0)
  })
})

// 仕様: specs/ikukyu/admin/requirements.md#集計表示-3、specs/ikukyu/admin/requirements.md#表示の初期値・区切り-2
describe('【管理】月給の平均と分布 - 平均月給と5区分ごとの件数を出す', () => {
  it('平均月給が出ること', () => {
    const records = [rec({ monthly_salary: 200000 }), rec({ monthly_salary: 400000 })]
    expect(aggregateSalary(records).average).toBe(300000)
  })

  it('5区分の境界値(20万・30万・40万・50万ちょうど)が正しく上の区分に入ること', () => {
    const records = [
      rec({ monthly_salary: 199999 }), // 20万円未満
      rec({ monthly_salary: 200000 }), // 20万円以上30万円未満
      rec({ monthly_salary: 300000 }), // 30万円以上40万円未満
      rec({ monthly_salary: 400000 }), // 40万円以上50万円未満
      rec({ monthly_salary: 500000 }), // 50万円以上
    ]
    const buckets = aggregateSalary(records).buckets
    expect(buckets).toEqual([
      { label: '20万円未満', count: 1 },
      { label: '20万円以上30万円未満', count: 1 },
      { label: '30万円以上40万円未満', count: 1 },
      { label: '40万円以上50万円未満', count: 1 },
      { label: '50万円以上', count: 1 },
    ])
  })

  it('対象が0件のとき、平均はnull(算出対象なし)になること', () => {
    expect(aggregateSalary([]).average).toBeNull()
  })
})

// 仕様: specs/ikukyu/admin/requirements.md#集計表示-4
describe('【管理】給付額・取得日数の平均 - 合計給付額と合計取得日数の平均を出す', () => {
  it('合計給付額と合計取得日数の平均が出ること', () => {
    const records = [
      rec({ total_amount: 1000000, total_leave_days: 300 }),
      rec({ total_amount: 2000000, total_leave_days: 400 }),
    ]
    const result = aggregateAverages(records)
    expect(result.totalAmount).toBe(1500000)
    expect(result.totalLeaveDays).toBe(350)
  })

  it('対象が0件のとき、平均はnull(算出対象なし)になること', () => {
    const result = aggregateAverages([])
    expect(result.totalAmount).toBeNull()
    expect(result.totalLeaveDays).toBeNull()
  })
})
