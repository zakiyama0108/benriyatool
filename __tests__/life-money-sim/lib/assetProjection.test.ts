import { describe, it, expect } from 'vitest'
import {
  calcAge,
  calcNetSurplus,
  calcRegularBonus,
  calcFinalYearMonth,
  buildSavingsAssetSeries,
  buildInvestmentAssetSeries,
  buildGainSeries,
  aggregateYearly,
  isRecurringEntryApplicable,
  calcRecurringTotals,
  buildMonthlyProjectionRows,
} from '../../../app/life-money-sim/lib/assetProjection'
import type { MonthlyProjectionRow, RecurringEntry } from '../../../app/life-money-sim/lib/types'

// テスト用の定期項目の登録内容を組み立てるヘルパー(名目・金額・種別・開始月・終了月・頻度)
function recurringEntry(partial: Partial<RecurringEntry> & { startYearMonth: string; endYearMonth: string }): RecurringEntry {
  return { label: '定期項目', amount: 10, type: 'income', frequencyMonths: 1, ...partial }
}

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
describe('当月の差引後余剰の計算 - 月次余剰資金(賞与抜き)に賞与・定期収入を足し、イベント支出・定期支出を差し引く', () => {
  it('賞与の登録がない月は、月次余剰資金にイベント合計を差し引いた値になること(定期収入・定期支出の該当なし)', () => {
    // 月次余剰資金15万円 - イベント合計(引っ越し10万円+家具5万円=15万円) = 0万円
    expect(calcNetSurplus(15, 0, 15, 0, 0)).toBe(0)
  })

  it('賞与とイベントが両方ある月は、月次余剰資金に賞与を足しイベント合計を差し引いた値になること(定期収入・定期支出の該当なし)', () => {
    // 月次余剰資金15万円 + 賞与50万円 - イベント合計20万円 = 45万円
    expect(calcNetSurplus(15, 50, 20, 0, 0)).toBe(45)
  })

  it('当月に該当する定期収入の合計があれば、基準値に加えられること', () => {
    // 月次余剰資金15万円 + 定期収入合計(副業5万円+積立3万円=8万円) = 23万円
    expect(calcNetSurplus(15, 0, 0, 8, 0)).toBe(23)
  })

  it('当月に該当する定期支出の合計があれば、基準値から差し引かれること', () => {
    // 月次余剰資金15万円 - 定期支出合計(家賃8万円) = 7万円
    expect(calcNetSurplus(15, 0, 0, 0, 8)).toBe(7)
  })

  it('賞与・イベント・定期収入・定期支出がすべて重なる月は、それぞれを加減した値になること', () => {
    // 月次余剰資金15万円 + 賞与50万円 + 定期収入8万円 - イベント合計20万円 - 定期支出8万円 = 45万円
    expect(calcNetSurplus(15, 50, 20, 8, 8)).toBe(45)
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#定期項目の頻度の正規化-1
describe('定期項目の頻度の正規化 - 不正な頻度は1(毎月)として扱う', () => {
  it('頻度が0以下・未入力・数値でない・小数の場合、整数部分への切り捨て後1未満なら初期値1(毎月)として該当判定されること', () => {
    // 頻度0は本来1ヶ月ごとに正規化されるため、開始月の翌月(月数差1)も該当するはず
    const entryZero = recurringEntry({ startYearMonth: '2026-01', endYearMonth: '2026-12', frequencyMonths: 0 })
    expect(isRecurringEntryApplicable(entryZero, '2026-02')).toBe(true)

    const entryNaN = recurringEntry({ startYearMonth: '2026-01', endYearMonth: '2026-12', frequencyMonths: NaN })
    expect(isRecurringEntryApplicable(entryNaN, '2026-02')).toBe(true)

    const entryDecimal = recurringEntry({ startYearMonth: '2026-01', endYearMonth: '2026-12', frequencyMonths: 0.5 })
    expect(isRecurringEntryApplicable(entryDecimal, '2026-02')).toBe(true)
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#定期的な収入・支出の登録-4
describe('当月に該当する定期収入・支出の判定 - 開始月から頻度(nヶ月)ごと、終了月以前の月に該当する', () => {
  it('開始月自身は月数差0のため必ず該当すること', () => {
    const entry = recurringEntry({ startYearMonth: '2026-04', endYearMonth: '2027-03', frequencyMonths: 3 })
    expect(isRecurringEntryApplicable(entry, '2026-04')).toBe(true)
  })

  it('頻度(3ヶ月ごと)の倍数にあたる月は該当すること', () => {
    const entry = recurringEntry({ startYearMonth: '2026-04', endYearMonth: '2027-03', frequencyMonths: 3 })
    expect(isRecurringEntryApplicable(entry, '2026-07')).toBe(true)
  })

  it('頻度(3ヶ月ごと)の倍数にあたらない月は該当しないこと', () => {
    const entry = recurringEntry({ startYearMonth: '2026-04', endYearMonth: '2027-03', frequencyMonths: 3 })
    expect(isRecurringEntryApplicable(entry, '2026-05')).toBe(false)
  })

  it('終了月ちょうどの月(頻度の倍数にも一致)は該当すること', () => {
    // 2026-04から3ヶ月ごと(月数差9)ちょうどに終了月2027-01を設定
    const entry = recurringEntry({ startYearMonth: '2026-04', endYearMonth: '2027-01', frequencyMonths: 3 })
    expect(isRecurringEntryApplicable(entry, '2027-01')).toBe(true)
  })

  it('終了月より後の月は、頻度の倍数にあたる月でも該当しないこと', () => {
    // 2027-04は2026-04から頻度3ヶ月の倍数(月数差12)だが、終了月2027-01より後のため該当しない
    const entry = recurringEntry({ startYearMonth: '2026-04', endYearMonth: '2027-01', frequencyMonths: 3 })
    expect(isRecurringEntryApplicable(entry, '2027-04')).toBe(false)
  })

  it('開始月が終了月より後(逆転した指定)の場合、どの月にも該当しないこと', () => {
    const entry = recurringEntry({ startYearMonth: '2027-01', endYearMonth: '2026-01', frequencyMonths: 1 })
    expect(isRecurringEntryApplicable(entry, '2026-06')).toBe(false)
    expect(isRecurringEntryApplicable(entry, '2027-01')).toBe(false)
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#定期的な収入・支出の登録-5、specs/life-money-sim/asset-projection/design.md#バリデーション
describe('当月に該当する定期収入・支出の合計 - 複数の登録が同じ月に該当する場合、種別ごとに合算する', () => {
  it('同じ月に該当する収入・支出それぞれの登録が複数あるとき、種別ごとに金額が合算されること', () => {
    const entries: RecurringEntry[] = [
      recurringEntry({ label: '副業収入', amount: 5, type: 'income', startYearMonth: '2026-01', endYearMonth: '2026-12' }),
      recurringEntry({ label: '積立', amount: 3, type: 'income', startYearMonth: '2026-01', endYearMonth: '2026-12' }),
      recurringEntry({ label: '家賃', amount: 8, type: 'expense', startYearMonth: '2026-01', endYearMonth: '2026-12' }),
    ]
    expect(calcRecurringTotals(entries, '2026-06')).toEqual({ incomeTotal: 8, expenseTotal: 8 })
  })

  it('金額が負数・NaNなど不正な登録は0として合算されること', () => {
    const entries: RecurringEntry[] = [
      recurringEntry({ label: '不正な収入', amount: -5, type: 'income', startYearMonth: '2026-01', endYearMonth: '2026-12' }),
      recurringEntry({ label: '不正な支出', amount: NaN, type: 'expense', startYearMonth: '2026-01', endYearMonth: '2026-12' }),
    ]
    expect(calcRecurringTotals(entries, '2026-06')).toEqual({ incomeTotal: 0, expenseTotal: 0 })
  })

  it('該当する登録が1件もない月は、収入・支出とも0になること', () => {
    const entries: RecurringEntry[] = [
      recurringEntry({ startYearMonth: '2026-04', endYearMonth: '2026-06' }),
    ]
    expect(calcRecurringTotals(entries, '2026-07')).toEqual({ incomeTotal: 0, expenseTotal: 0 })
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#前提入力-6、specs/life-money-sim/asset-projection/requirements.md#前提入力-7、specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-4
describe('表示範囲の最終年月の決定 - 開始年月から表示範囲(年数)後の同月とする', () => {
  it('表示年数が指定されている場合、開始年月に表示年数を足した同月が返ること(本人の生年月の有無によらない)', () => {
    expect(calcFinalYearMonth('2026-01', 10)).toBe('2036-01')
  })

  it('表示年数が0以下の場合、初期値30年として計算されること', () => {
    expect(calcFinalYearMonth('2026-01', 0)).toBe('2056-01')
    expect(calcFinalYearMonth('2026-01', -5)).toBe('2056-01')
  })

  it('表示年数が数値でない(NaN)場合、初期値30年として計算されること', () => {
    expect(calcFinalYearMonth('2026-01', NaN)).toBe('2056-01')
  })

  it('表示年数に小数が入力された場合、整数部分に切り捨てて計算されること', () => {
    expect(calcFinalYearMonth('2026-01', 2.9)).toBe('2028-01')
  })

  it('表示年数が0.5・0.9のような「切り捨てると1未満になる小数」の場合、初期値30年として計算されること', () => {
    expect(calcFinalYearMonth('2026-01', 0.5)).toBe('2056-01')
    expect(calcFinalYearMonth('2026-01', 0.9)).toBe('2056-01')
  })

  it('表示年数がちょうど1(有効な最小値)の場合、フォールバックせずそのまま1年として計算されること', () => {
    expect(calcFinalYearMonth('2026-01', 1)).toBe('2027-01')
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
    return {
      selfAge: undefined,
      spouseAge: undefined,
      childrenAges: [],
      eventItems: [],
      incomeBonusAmount: 0,
      eventBonusAmount: 0,
      recurringLabels: [],
      investmentGain: 0,
      ...partial,
    }
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

  // 仕様: specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-3
  it('その年に発生したイベントの名目・金額がすべて集められて年の行にまとめられること(同じ名目でも合算しない)', () => {
    const rows: MonthlyProjectionRow[] = [
      row({ yearMonth: '2026-06', netSurplus: 10, asset: 110, eventItems: [{ label: '結婚', amount: 30 }] }),
      row({
        yearMonth: '2026-09',
        netSurplus: 10,
        asset: 120,
        eventItems: [
          { label: '引っ越し', amount: 20 },
          { label: '引っ越し', amount: 5 }, // 同じ名目で複数回発生しても、発生ごとに別物として合算せず残ること
        ],
      }),
    ]
    const result = aggregateYearly(rows)
    expect(result[0].eventItems).toEqual([
      { label: '結婚', amount: 30 },
      { label: '引っ越し', amount: 20 },
      { label: '引っ越し', amount: 5 },
    ])
  })

  // 仕様: specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-4
  it('その年の収入賞与・イベント賞与は、それぞれ年の行で別々に合計されること', () => {
    const rows: MonthlyProjectionRow[] = [
      row({ yearMonth: '2026-06', netSurplus: 10, asset: 110, incomeBonusAmount: 150, eventBonusAmount: 30 }),
      row({ yearMonth: '2026-12', netSurplus: 10, asset: 120, incomeBonusAmount: 150, eventBonusAmount: 20 }),
    ]
    const result = aggregateYearly(rows)
    expect(result[0].incomeBonusAmount).toBe(300)
    expect(result[0].eventBonusAmount).toBe(50)
  })

  // 仕様: specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-6
  it('その年の運用益が月次合計として年の行に集計されること', () => {
    const rows: MonthlyProjectionRow[] = [
      row({ yearMonth: '2026-06', netSurplus: 10, asset: 110, investmentGain: 1 }),
      row({ yearMonth: '2026-09', netSurplus: 10, asset: 120, investmentGain: 1.2 }),
    ]
    const result = aggregateYearly(rows)
    expect(result[0].investmentGain).toBeCloseTo(2.2)
  })

  it('その年のどの月にも賞与がなければ、年の行の収入賞与・イベント賞与はどちらも0になること', () => {
    const rows: MonthlyProjectionRow[] = [
      row({ yearMonth: '2026-06', netSurplus: 10, asset: 110 }),
      row({ yearMonth: '2026-09', netSurplus: 10, asset: 120 }),
    ]
    const result = aggregateYearly(rows)
    expect(result[0].incomeBonusAmount).toBe(0)
    expect(result[0].eventBonusAmount).toBe(0)
  })

  // 仕様: specs/life-money-sim/asset-projection/requirements.md#定期的な収入・支出の登録-6
  it('その年に該当した定期収入・定期支出は、名目・種別ごとに該当月の金額を合計して1件にまとめられること', () => {
    const rows: MonthlyProjectionRow[] = [
      row({ yearMonth: '2026-04', netSurplus: 10, asset: 110, recurringLabels: [{ label: '家賃', type: 'expense', amount: 8 }] }),
      row({
        yearMonth: '2026-07',
        netSurplus: 10,
        asset: 120,
        recurringLabels: [
          { label: '家賃', type: 'expense', amount: 8 },
          { label: '副業収入', type: 'income', amount: 5 },
        ],
      }),
    ]
    const result = aggregateYearly(rows)
    expect(result[0].recurringLabels).toEqual([
      { label: '家賃', type: 'expense', amount: 16 },
      { label: '副業収入', type: 'income', amount: 5 },
    ])
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#定期的な収入・支出の登録-6
describe('月次積み上げへの定期収入・支出の反映 - 該当月の差引後余剰・定期項目名目に反映する', () => {
  const baseParams = {
    startYearMonth: '2026-01',
    finalYearMonth: '2026-03',
    startingAsset: 0,
    monthlySurplus: 0,
    selfBirthMonth: null,
    spouseBirthMonth: null,
    childrenBirthMonths: [],
    bonusMonths: [],
    bonusAmountPerTime: 0,
    bonuses: [],
    events: [],
    investmentMode: false,
    expectedAnnualRate: 0,
  }

  it('定期項目一覧を渡した場合、該当月のnetSurplusに定期収入・定期支出が反映されること', () => {
    const rows = buildMonthlyProjectionRows({
      ...baseParams,
      recurringEntries: [
        recurringEntry({ label: '副業収入', amount: 5, type: 'income', startYearMonth: '2026-01', endYearMonth: '2026-12' }),
        recurringEntry({ label: '家賃', amount: 8, type: 'expense', startYearMonth: '2026-01', endYearMonth: '2026-12' }),
      ],
    })
    // 月次余剰資金0 + 定期収入5 - 定期支出8 = -3
    expect(rows[0].netSurplus).toBe(-3)
  })

  it('定期項目一覧を渡した場合、該当月のrecurringLabelsに該当した名目・金額が反映されること', () => {
    const rows = buildMonthlyProjectionRows({
      ...baseParams,
      recurringEntries: [
        recurringEntry({ label: '副業収入', amount: 5, type: 'income', startYearMonth: '2026-02', endYearMonth: '2026-02' }),
      ],
    })
    expect(rows[0].recurringLabels).toEqual([])
    expect(rows[1].recurringLabels).toEqual([{ label: '副業収入', type: 'income', amount: 5 }])
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-3、specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-4
describe('月次積み上げへの賞与・イベントの金額反映 - 該当月のeventItems・bonusAmountに金額を反映する', () => {
  const baseParams = {
    startYearMonth: '2026-01',
    finalYearMonth: '2026-02',
    startingAsset: 0,
    monthlySurplus: 0,
    selfBirthMonth: null,
    spouseBirthMonth: null,
    childrenBirthMonths: [],
    bonusMonths: [],
    bonusAmountPerTime: 0,
    recurringEntries: [],
    investmentMode: false,
    expectedAnnualRate: 0,
  }

  it('イベントの登録があれば、該当月のeventItemsに名目・金額が反映されること(複数件は名目ごとに並ぶ)', () => {
    const rows = buildMonthlyProjectionRows({
      ...baseParams,
      bonuses: [],
      events: [
        { yearMonth: '2026-01', label: '結婚', amount: 30 },
        { yearMonth: '2026-01', label: '結婚指輪', amount: 10 },
      ],
    })
    expect(rows[0].eventItems).toEqual([
      { label: '結婚', amount: 30 },
      { label: '結婚指輪', amount: 10 },
    ])
    expect(rows[1].eventItems).toEqual([])
  })

  it('賞与の登録があれば、該当月のeventBonusAmountに合計額が反映されること(登録がない月は0)', () => {
    const rows = buildMonthlyProjectionRows({
      ...baseParams,
      bonuses: [{ yearMonth: '2026-01', amount: 50 }],
      events: [],
    })
    expect(rows[0].eventBonusAmount).toBe(50)
    expect(rows[1].eventBonusAmount).toBe(0)
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-5
describe('当月の通常ボーナス - 収入で登録した支給月に1回あたりの金額を返す', () => {
  it('対象年月の月が支給月に含まれる場合、1回あたりの金額を返すこと', () => {
    expect(calcRegularBonus([6, 12], 150, '2026-06')).toBe(150)
    expect(calcRegularBonus([6, 12], 150, '2027-12')).toBe(150)
  })

  it('対象年月の月が支給月に含まれない場合、0を返すこと', () => {
    expect(calcRegularBonus([6, 12], 150, '2026-05')).toBe(0)
  })

  it('支給月が未選択(空配列)の場合、常に0を返すこと', () => {
    expect(calcRegularBonus([], 150, '2026-06')).toBe(0)
  })

  it('1回あたりの金額が負数・NaNなど不正な場合、0として扱うこと', () => {
    expect(calcRegularBonus([6], -10, '2026-06')).toBe(0)
    expect(calcRegularBonus([6], NaN, '2026-06')).toBe(0)
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-6、specs/life-money-sim/asset-projection/requirements.md#複利計算-2
describe('各月の運用益の系列', () => {
  it('貯蓄のみモードでは、運用益は全月0になること', () => {
    expect(buildGainSeries(100, [110, 130, 125], false, 12)).toEqual([0, 0, 0])
  })

  it('資産運用モードでは、各月の運用益が前月末の資産額(初月は開始資産額)×月利になること', () => {
    // 年率12%→月利1%。開始100万円、資産系列[101, 102.01]
    // 1か月目の運用益: 100*0.01=1、2か月目: 101*0.01=1.01
    const gains = buildGainSeries(100, [101, 102.01], true, 12)
    expect(gains[0]).toBeCloseTo(1)
    expect(gains[1]).toBeCloseTo(1.01)
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-5、specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-6
describe('月次積み上げへの通常ボーナス・運用益の反映', () => {
  const baseParams = {
    startYearMonth: '2026-05',
    finalYearMonth: '2026-06',
    startingAsset: 0,
    monthlySurplus: 0,
    selfBirthMonth: null,
    spouseBirthMonth: null,
    childrenBirthMonths: [],
    bonusMonths: [] as number[],
    bonusAmountPerTime: 0,
    bonuses: [],
    events: [],
    recurringEntries: [],
    investmentMode: false,
    expectedAnnualRate: 0,
  }

  it('収入の支給月に該当する月は、incomeBonusAmountに通常ボーナスが積まれ、netSurplusにも反映されること', () => {
    const rows = buildMonthlyProjectionRows({ ...baseParams, bonusMonths: [6], bonusAmountPerTime: 150 })
    // 2026-05は非該当、2026-06は該当
    expect(rows[0].incomeBonusAmount).toBe(0)
    expect(rows[1].incomeBonusAmount).toBe(150)
    expect(rows[1].netSurplus).toBe(150)
  })

  it('通常ボーナスと賞与登録が同じ月に重なる場合、収入賞与とイベント賞与は別々に保持され、netSurplusには両者が合算されること', () => {
    const rows = buildMonthlyProjectionRows({
      ...baseParams,
      bonusMonths: [6],
      bonusAmountPerTime: 150,
      bonuses: [{ yearMonth: '2026-06', amount: 20 }],
    })
    expect(rows[1].incomeBonusAmount).toBe(150)
    expect(rows[1].eventBonusAmount).toBe(20)
    expect(rows[1].netSurplus).toBe(170)
  })

  it('資産運用モードでは各行のinvestmentGainに当月の運用益が入り、貯蓄のみモードでは0になること', () => {
    const savings = buildMonthlyProjectionRows({ ...baseParams, startingAsset: 100 })
    expect(savings[0].investmentGain).toBe(0)

    // 年率12%→月利1%、開始100万円・余剰0 → 初月の運用益=100*0.01=1
    const investment = buildMonthlyProjectionRows({ ...baseParams, startingAsset: 100, investmentMode: true, expectedAnnualRate: 12 })
    expect(investment[0].investmentGain).toBeCloseTo(1)
  })
})
