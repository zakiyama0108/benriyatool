import { describe, it, expect } from 'vitest'
import {
  calcAge,
  calcNetSurplus,
  calcFinalYearMonth,
  buildSavingsAssetSeries,
  buildInvestmentAssetSeries,
  aggregateYearly,
} from '../../../app/life-money-sim/lib/assetProjection'
import type { MonthlyProjectionRow } from '../../../app/life-money-sim/lib/types'

// 仕様: specs/life-money-sim/asset-projection/requirements.md#前提入力-3、specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-3
describe('対象年月の家族の年齢の計算 - 生年月と対象年月から満年齢を求める', () => {
  it('対象年月の月が生年月の月以上のとき(誕生日を迎えた後)、対象年月の年から生年月の年を引いた値になること', () => {
    // 生年月1990-06、対象年月2026-06(誕生月そのもの) → 36歳
    expect(calcAge('1990-06', '2026-06')).toBe(36)
  })

  it('対象年月の月が生年月の月より小さいとき(まだ誕生日を迎えていない)、年の差から1引いた値になること', () => {
    // 生年月1990-06、対象年月2026-05(誕生月の前月) → まだ36歳の誕生日を迎えていないので35歳
    expect(calcAge('1990-06', '2026-05')).toBe(35)
  })

  it('生年月が未入力(null)の場合、年齢はundefined(未表示扱い)になること', () => {
    expect(calcAge(null, '2026-06')).toBeUndefined()
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-2
describe('当月の差引後余剰の計算 - 月次余剰資金(賞与抜き)に賞与を足しイベント支出を差し引く', () => {
  it('賞与の登録がない月は、月次余剰資金にイベント合計を差し引いた値になること', () => {
    // 月次余剰資金15万円 - イベント合計(引っ越し10万円+家具5万円=15万円) = 0万円
    expect(calcNetSurplus(15, 0, 15)).toBe(0)
  })

  it('賞与とイベントが両方ある月は、月次余剰資金に賞与を足しイベント合計を差し引いた値になること', () => {
    // 月次余剰資金15万円 + 賞与50万円 - イベント合計20万円 = 45万円
    expect(calcNetSurplus(15, 50, 20)).toBe(45)
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-4
describe('表示範囲の最終年月の決定 - 本人が70歳になる年月、または生年月未入力時は開始年月の30年後', () => {
  it('本人の生年月が入力されている場合、本人が70歳になる年月(生年月の70年後の同月)が返ること', () => {
    expect(calcFinalYearMonth('1990-06', '2026-01')).toBe('2060-06')
  })

  it('本人の生年月が未入力の場合、開始年月の30年後の同月が返ること', () => {
    expect(calcFinalYearMonth(null, '2026-01')).toBe('2056-01')
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-1、specs/life-money-sim/asset-projection/requirements.md#貯蓄/運用シミュレーションの切り替え-1
describe('貯蓄のみモードの月次資産推移の積み上げ', () => {
  it('開始資産額に各月の差引後余剰を順に積み上げた配列が返ること', () => {
    // 開始資産額100万円、差引後余剰[10, 20, -5]
    // 1か月目: 100+10=110、2か月目: 110+20=130、3か月目: 130-5=125
    expect(buildSavingsAssetSeries(100, [10, 20, -5])).toEqual([110, 130, 125])
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#複利計算-1、specs/life-money-sim/asset-projection/requirements.md#複利計算-2、specs/life-money-sim/asset-projection/requirements.md#貯蓄/運用シミュレーションの切り替え-2
describe('資産運用モードの月次資産推移の積み上げ', () => {
  it('想定利回り(年率)を月利に換算し、前月資産額への運用益を加算したうえで差引後余剰を積み上げた配列が返ること', () => {
    // 年率12%→月利1%。開始資産額100万円、差引後余剰[0, 0]
    // 1か月目: 100 + 100*0.01 + 0 = 101、2か月目: 101 + 101*0.01 + 0 = 102.01
    const result = buildInvestmentAssetSeries(100, [0, 0], 12)
    expect(result[0]).toBeCloseTo(101)
    expect(result[1]).toBeCloseTo(102.01)
  })

  it('想定利回り0%の場合は貯蓄のみモードと同じ結果になること', () => {
    const savings = buildSavingsAssetSeries(100, [10, 20, -5])
    const investment = buildInvestmentAssetSeries(100, [10, 20, -5], 0)
    expect(investment).toEqual(savings)
  })
})

// 仕様: specs/life-money-sim/asset-projection/design.md#バリデーション
describe('開始資産額・想定利回りのバリデーション - 不正な金額は0として計算する', () => {
  it('開始資産額が負数のとき、0として積み上げが計算されること', () => {
    expect(buildSavingsAssetSeries(-100, [10])).toEqual([10])
  })

  it('想定利回りが数値以外(NaN)のとき、0%として運用益なしで積み上げが計算されること', () => {
    expect(buildInvestmentAssetSeries(100, [10], NaN)).toEqual([110])
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#表示単位の切り替え-2
describe('月次データを年次にまとめる集計', () => {
  function row(partial: Partial<MonthlyProjectionRow> & { yearMonth: string; netSurplus: number; asset: number }): MonthlyProjectionRow {
    return { selfAge: undefined, spouseAge: undefined, childrenAges: [], eventLabels: [], hasBonus: false, ...partial }
  }

  it('同じ年の12か月分の行が1行にまとまり、年次余剰資金が12か月分の合計になること', () => {
    const rows: MonthlyProjectionRow[] = Array.from({ length: 12 }, (_, i) =>
      row({ yearMonth: `2026-${String(i + 1).padStart(2, '0')}`, netSurplus: 10, asset: 100 + i * 10, selfAge: 36 })
    )
    const result = aggregateYearly(rows)
    expect(result).toHaveLength(1)
    expect(result[0].year).toBe(2026)
    expect(result[0].yearlySurplus).toBe(120)
  })

  it('開始年・最終年が年の途中からになる場合、その年にある月だけが対象になること', () => {
    const rows: MonthlyProjectionRow[] = [
      row({ yearMonth: '2026-11', netSurplus: 10, asset: 110 }),
      row({ yearMonth: '2026-12', netSurplus: 10, asset: 120 }),
      row({ yearMonth: '2027-01', netSurplus: 10, asset: 130 }),
    ]
    const result = aggregateYearly(rows)
    expect(result).toHaveLength(2)
    expect(result[0].year).toBe(2026)
    expect(result[0].yearlySurplus).toBe(20)
    expect(result[1].year).toBe(2027)
    expect(result[1].yearlySurplus).toBe(10)
  })

  it('年末時点(またはその年の最終月)の年齢・資産額が代表値として採用されること', () => {
    const rows: MonthlyProjectionRow[] = [
      row({ yearMonth: '2026-11', netSurplus: 10, asset: 110, selfAge: 35 }),
      row({ yearMonth: '2026-12', netSurplus: 10, asset: 120, selfAge: 36 }),
    ]
    const result = aggregateYearly(rows)
    expect(result[0].asset).toBe(120)
    expect(result[0].selfAge).toBe(36)
  })

  it('その年に発生したイベントの名目がすべて集められて年の行にまとめられること', () => {
    const rows: MonthlyProjectionRow[] = [
      row({ yearMonth: '2026-06', netSurplus: 10, asset: 110, eventLabels: ['結婚'] }),
      row({ yearMonth: '2026-09', netSurplus: 10, asset: 120, eventLabels: ['引っ越し'] }),
    ]
    const result = aggregateYearly(rows)
    expect(result[0].eventLabels).toEqual(['結婚', '引っ越し'])
  })

  it('その年のいずれかの月に賞与が登録されていれば、年の行もhasBonus=trueになること', () => {
    const rows: MonthlyProjectionRow[] = [
      row({ yearMonth: '2026-06', netSurplus: 10, asset: 110, hasBonus: true }),
      row({ yearMonth: '2026-09', netSurplus: 10, asset: 120, hasBonus: false }),
    ]
    const result = aggregateYearly(rows)
    expect(result[0].hasBonus).toBe(true)
  })

  it('その年のどの月にも賞与が登録されていなければ、年の行はhasBonus=falseになること', () => {
    const rows: MonthlyProjectionRow[] = [
      row({ yearMonth: '2026-06', netSurplus: 10, asset: 110, hasBonus: false }),
      row({ yearMonth: '2026-09', netSurplus: 10, asset: 120, hasBonus: false }),
    ]
    const result = aggregateYearly(rows)
    expect(result[0].hasBonus).toBe(false)
  })
})
