import { describe, it, expect } from 'vitest'
import {
  chooseTrendUnit,
  buildTrend,
  aggregateSpouse,
  aggregateMode,
  aggregateAsset,
  aggregateAverages,
} from '../../../../app/life-money-sim/admin/lib/aggregate'
import type { AdminRecord } from '../../../../app/life-money-sim/admin/lib/types'

// テスト用に、必要なカラムだけ指定してレコードを組み立てるヘルパー
function rec(over: Partial<AdminRecord>): AdminRecord {
  return {
    id: 'x',
    created_at: '2026-07-15T02:00:00.000Z',
    has_spouse: true,
    children_count: 1,
    monthly_salary: 35,
    personal_expense_monthly: 8,
    household_expense_total: 20,
    my_household_share: 10,
    starting_asset: 300,
    investment_mode: false,
    expected_annual_rate: null,
    event_count: 0,
    final_month_asset: 1000,
    monthly_surplus: 17,
    is_test: false,
    ...over,
  }
}

// 仕様: specs/life-money-sim/admin/requirements.md#集計表示-1、specs/life-money-sim/admin/requirements.md#表示の初期値・区切り-3
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

// 仕様: specs/life-money-sim/admin/requirements.md#集計表示-1
describe('【管理】利用件数の推移 - 保存日時ごとの件数を日別または月別に数える', () => {
  it('日別のとき、日本時間の同じ日の保存が1つの点にまとまり、日付の昇順で並ぶこと', () => {
    const records = [
      rec({ created_at: '2026-07-15T01:00:00.000Z' }), // JST 7/15
      rec({ created_at: '2026-07-15T20:00:00.000Z' }), // JST 7/16
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

// 仕様: specs/life-money-sim/admin/requirements.md#集計表示-4
describe('【管理】配偶者ありの件数と割合', () => {
  it('配偶者ありの件数と、全体に占める割合が出ること', () => {
    const records = [rec({ has_spouse: true }), rec({ has_spouse: true }), rec({ has_spouse: false })]
    const result = aggregateSpouse(records)
    expect(result.count).toBe(2)
    expect(result.ratio).toBeCloseTo(2 / 3)
  })

  it('対象が0件のとき、件数も割合も0になること(0での割り算をしない)', () => {
    const result = aggregateSpouse([])
    expect(result.count).toBe(0)
    expect(result.ratio).toBe(0)
  })
})

// 仕様: specs/life-money-sim/admin/requirements.md#集計表示-4
describe('【管理】運用モード別の件数と比率', () => {
  it('貯蓄のみ・資産運用それぞれの件数と、全体に占める比率が出ること', () => {
    const records = [
      rec({ investment_mode: true }),
      rec({ investment_mode: true }),
      rec({ investment_mode: false }),
      rec({ investment_mode: false }),
    ]
    const result = aggregateMode(records)
    expect(result.investmentCount).toBe(2)
    expect(result.savingsCount).toBe(2)
    expect(result.investmentRatio).toBeCloseTo(0.5)
    expect(result.savingsRatio).toBeCloseTo(0.5)
  })

  it('対象が0件のとき、件数も比率も0になること', () => {
    const result = aggregateMode([])
    expect(result.investmentCount).toBe(0)
    expect(result.investmentRatio).toBe(0)
  })
})

// 仕様: specs/life-money-sim/admin/requirements.md#集計表示-2、specs/life-money-sim/admin/requirements.md#表示の初期値・区切り-2
describe('【管理】最終月時点の資産額の平均と分布', () => {
  it('平均資産額が出ること', () => {
    const records = [rec({ final_month_asset: 100 }), rec({ final_month_asset: 300 })]
    expect(aggregateAsset(records).average).toBe(200)
  })

  it('5区分の境界値(100万・500万・1000万・3000万ちょうど)が正しく上の区分に入ること', () => {
    const records = [
      rec({ final_month_asset: 99 }), // 100万円未満
      rec({ final_month_asset: 100 }), // 100万円以上500万円未満
      rec({ final_month_asset: 500 }), // 500万円以上1000万円未満
      rec({ final_month_asset: 1000 }), // 1000万円以上3000万円未満
      rec({ final_month_asset: 3000 }), // 3000万円以上
    ]
    const buckets = aggregateAsset(records).buckets
    expect(buckets).toEqual([
      { label: '100万円未満', count: 1 },
      { label: '100万円以上500万円未満', count: 1 },
      { label: '500万円以上1000万円未満', count: 1 },
      { label: '1000万円以上3000万円未満', count: 1 },
      { label: '3000万円以上', count: 1 },
    ])
  })

  it('対象が0件のとき、平均はnull(算出対象なし)になること', () => {
    expect(aggregateAsset([]).average).toBeNull()
  })

  it('資産額がマイナス(異常な資産推移)のレコードも、最小区分(100万円未満)にカウントされること', () => {
    const records = [rec({ final_month_asset: -50 })]
    const buckets = aggregateAsset(records).buckets
    expect(buckets.find((b) => b.label === '100万円未満')?.count).toBe(1)
  })
})

// 仕様: specs/life-money-sim/admin/requirements.md#集計表示-3
describe('【管理】月次余剰資金の平均', () => {
  it('月次余剰資金の平均が出ること', () => {
    const records = [rec({ monthly_surplus: 10 }), rec({ monthly_surplus: 20 })]
    expect(aggregateAverages(records).monthlySurplus).toBe(15)
  })

  it('対象が0件のとき、平均はnull(算出対象なし)になること', () => {
    expect(aggregateAverages([]).monthlySurplus).toBeNull()
  })
})
