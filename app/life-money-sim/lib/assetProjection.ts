import type { MonthlyProjectionRow, YearlyProjectionRow, YearMonth, BonusEntry, EventEntry, RecurringEntry, RecurringLabel } from './types'

// "YYYY-MM" を年・月の数値に分解する
function parseYearMonth(yearMonth: YearMonth): { year: number; month: number } {
  const [year, month] = yearMonth.split('-').map(Number)
  return { year, month }
}

function formatYearMonth(year: number, month: number): YearMonth {
  return `${year}-${String(month).padStart(2, '0')}`
}

// fromからtoまでの月数差(to - from)を求める
function monthsBetween(from: YearMonth, to: YearMonth): number {
  const f = parseYearMonth(from)
  const t = parseYearMonth(to)
  return (t.year - f.year) * 12 + (t.month - f.month)
}

// 開始資産額・想定利回り・賞与額・イベント金額のバリデーション。0未満・数値でない(NaN等)入力は
// 0として扱い、他の入力欄の計算をブロックしない(仕様: design.md#バリデーション、monthly-balanceと同じ方針)
function sanitizeAmount(amount: number): number {
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

// 生年月と対象年月から満年齢を求める。対象年月の月が生年月の月以上なら「誕生日を迎えた後」、
// 小さければ「まだ迎えていない」と判定する。生年月が未入力の場合はundefined(年齢欄は非表示)
// (仕様: requirements.md#前提入力-3、requirements.md#前提入力-5、requirements.md#月次の資産推移-3、
//  design.md#対象年月の家族の年齢を求める処理)
export function calcAge(birthYearMonth: YearMonth | null, targetYearMonth: YearMonth): number | undefined {
  if (!birthYearMonth) return undefined
  const birth = parseYearMonth(birthYearMonth)
  const target = parseYearMonth(targetYearMonth)
  const hasHadBirthdayThisYear = target.month >= birth.month
  return target.year - birth.year - (hasHadBirthdayThisYear ? 0 : 1)
}

// 月次余剰資金(賞与抜き)に当月の賞与・定期収入を加え、当月のイベント合計・定期支出を差し引いた
// 「当月の差引後余剰」を求める(仕様: requirements.md#月次の資産推移-2、design.md#当月の差引後余剰を求める処理)
export function calcNetSurplus(
  monthlySurplus: number,
  bonusAmount: number,
  eventTotal: number,
  recurringIncomeTotal: number,
  recurringExpenseTotal: number
): number {
  return monthlySurplus + bonusAmount + recurringIncomeTotal - eventTotal - recurringExpenseTotal
}

// 定期項目の頻度(何ヶ月ごとか)を1以上の整数に正規化する。小数はまず整数部分に切り捨て、その結果が
// 1未満(0以下)、または未入力・数値でない値の場合は初期値(1・毎月)にフォールバックする
// (仕様: requirements.md#定期項目の頻度の正規化-1、design.md#当月に該当する定期収入・支出を求める処理)
const DEFAULT_FREQUENCY_MONTHS = 1 // 毎月

function normalizeFrequencyMonths(frequencyMonths: number): number {
  const floored = Math.floor(frequencyMonths)
  return Number.isFinite(floored) && floored >= 1 ? floored : DEFAULT_FREQUENCY_MONTHS
}

// 対象年月が、定期項目の登録(開始月・終了月・頻度)に該当するかどうかを判定する。
// 対象年月が開始月以上・終了月以下であり、かつ(対象年月と開始月の月数差)が正規化した頻度で
// 割り切れる場合に該当する(開始月自身は月数差0のため必ず該当する)。開始月が終了月より後の場合は、
// 開始月以上・終了月以下を同時に満たす月が存在しないため自然に非該当となる
// (仕様: requirements.md#定期的な収入・支出の登録-4、design.md#当月に該当する定期収入・支出を求める処理)
export function isRecurringEntryApplicable(entry: RecurringEntry, targetYearMonth: YearMonth): boolean {
  const frequency = normalizeFrequencyMonths(entry.frequencyMonths)
  const diffFromStart = monthsBetween(entry.startYearMonth, targetYearMonth)
  const diffToEnd = monthsBetween(targetYearMonth, entry.endYearMonth)
  return diffFromStart >= 0 && diffToEnd >= 0 && diffFromStart % frequency === 0
}

// 対象年月に該当する定期項目を種別(収入/支出)ごとに合算する。複数件が同じ月に該当する場合は
// すべて合算し、不正な金額(0未満・NaN等)は0として扱う
// (仕様: requirements.md#定期的な収入・支出の登録-5、design.md#当月に該当する定期収入・支出を求める処理)
export function calcRecurringTotals(
  entries: RecurringEntry[],
  targetYearMonth: YearMonth
): { incomeTotal: number; expenseTotal: number } {
  const matched = entries.filter((entry) => isRecurringEntryApplicable(entry, targetYearMonth))
  return {
    incomeTotal: matched.filter((e) => e.type === 'income').reduce((sum, e) => sum + sanitizeAmount(e.amount), 0),
    expenseTotal: matched.filter((e) => e.type === 'expense').reduce((sum, e) => sum + sanitizeAmount(e.amount), 0),
  }
}

// 表示範囲(年数)を1以上の整数に正規化する。小数はまず整数部分に切り捨て、その結果が1未満(0以下)、
// または未入力・数値でない値の場合は初期値(30)にフォールバックする
// (仕様: requirements.md#前提入力-7、design.md#表示範囲の最終年月を決める処理)
const DEFAULT_DISPLAY_YEARS = 30 // 老後までの見通しを想定した目安年数(requirements.md#前提入力-6)

function normalizeDisplayYears(displayYears: number): number {
  const floored = Math.floor(displayYears)
  return Number.isFinite(floored) && floored >= 1 ? floored : DEFAULT_DISPLAY_YEARS
}

// 表示範囲の最終年月を決める。開始年月に、正規化した表示範囲(年数)を足した同月とする
// (本人の生年月の有無・値によらない。仕様: requirements.md#前提入力-6、requirements.md#前提入力-7、
//  requirements.md#月次の資産推移-4、design.md#表示範囲の最終年月を決める処理)
export function calcFinalYearMonth(startYearMonth: YearMonth, displayYears: number): YearMonth {
  const years = normalizeDisplayYears(displayYears)
  const start = parseYearMonth(startYearMonth)
  return formatYearMonth(start.year + years, start.month)
}

// 貯蓄のみモード: 開始資産額に各月の差引後余剰を順に積み上げる
// (仕様: requirements.md#貯蓄/運用シミュレーションの切り替え-1、design.md#貯蓄のみモードで月次資産額を積み上げる処理)
export function buildSavingsAssetSeries(startingAsset: number, netSurpluses: number[]): number[] {
  const series: number[] = []
  let asset = sanitizeAmount(startingAsset)
  for (const netSurplus of netSurpluses) {
    asset = asset + netSurplus
    series.push(asset)
  }
  return series
}

// 資産運用モード: 想定利回り(年率・%)を12で割った月利で、前月末の資産額に運用益を加えたうえで
// 当月の差引後余剰を積み上げる(仕様: requirements.md#複利計算-1、requirements.md#複利計算-2、
// design.md#資産運用モードで月次資産額を積み上げる処理)
export function buildInvestmentAssetSeries(startingAsset: number, netSurpluses: number[], expectedAnnualRate: number): number[] {
  const monthlyRate = sanitizeAmount(expectedAnnualRate) / 100 / 12
  const series: number[] = []
  let asset = sanitizeAmount(startingAsset)
  for (const netSurplus of netSurpluses) {
    asset = asset + asset * monthlyRate + netSurplus
    series.push(asset)
  }
  return series
}

// その年に該当した定期項目を名目・種別ごとに1件へまとめ、該当した月の金額を合計する
// (同じ定期登録が年内に複数月該当するため、月ごとに繰り返し表示せず年間合計にする。
//  仕様: requirements.md#定期的な収入・支出の登録-6、design.md#月次データを年次にまとめる処理)
function aggregateRecurringLabelsForYear(yearRows: MonthlyProjectionRow[]): RecurringLabel[] {
  const byKey = new Map<string, RecurringLabel>()
  for (const row of yearRows) {
    for (const label of row.recurringLabels) {
      const key = `${label.type}:${label.label}`
      const existing = byKey.get(key)
      if (existing) {
        existing.amount += label.amount
      } else {
        byKey.set(key, { ...label })
      }
    }
  }
  return [...byKey.values()]
}

// 月次で積み上げた資産推移の全行を、同じ年の12か月分ごとに1行へ集計する。
// 年次余剰資金はその年の差引後余剰の合計、年齢・資産額はその年の最終月(12月、または開始/最終年で
// 12月がない場合はその年の最終月)の値を代表値として採用する。イベントは発生ごとに別物として
// 合算せずすべて集め、定期項目は名目・種別ごとに該当月の金額を合計して1件にまとめる
// (仕様: requirements.md#表示単位の切り替え-2、requirements.md#賞与・イベントの登録-3、
//  requirements.md#定期的な収入・支出の登録-6、design.md#月次データを年次にまとめる処理)
export function aggregateYearly(rows: MonthlyProjectionRow[]): YearlyProjectionRow[] {
  const byYear = new Map<number, MonthlyProjectionRow[]>()
  for (const row of rows) {
    const { year } = parseYearMonth(row.yearMonth)
    if (!byYear.has(year)) byYear.set(year, [])
    byYear.get(year)!.push(row)
  }

  return [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, yearRows]) => {
      const last = yearRows[yearRows.length - 1]
      return {
        year,
        selfAge: last.selfAge,
        spouseAge: last.spouseAge,
        childrenAges: last.childrenAges,
        eventItems: yearRows.flatMap((r) => r.eventItems),
        bonusAmount: yearRows.reduce((sum, r) => sum + r.bonusAmount, 0),
        recurringLabels: aggregateRecurringLabelsForYear(yearRows),
        yearlySurplus: yearRows.reduce((sum, r) => sum + r.netSurplus, 0),
        asset: last.asset,
      }
    })
}

// 開始年月から表示範囲の最終年月までの月次データ(年齢・イベント名目・差引後余剰・資産額)を
// Task2〜7の算出関数を組み合わせて組み立てる、page.tsxから呼び出すための結合関数。
// 個別のspec項目に対応する処理フローではなく既存関数の配線のため、単体テストは設けない
// (design.md#関連するファイル(抜粋))
export function buildMonthlyProjectionRows(params: {
  startYearMonth: YearMonth
  finalYearMonth: YearMonth
  startingAsset: number
  monthlySurplus: number
  selfBirthMonth: YearMonth | null
  spouseBirthMonth: YearMonth | null
  childrenBirthMonths: (YearMonth | null)[]
  bonuses: BonusEntry[]
  events: EventEntry[]
  recurringEntries: RecurringEntry[]
  investmentMode: boolean
  expectedAnnualRate: number
}): MonthlyProjectionRow[] {
  const yearMonths: YearMonth[] = []
  let cursor = parseYearMonth(params.startYearMonth)
  const final = parseYearMonth(params.finalYearMonth)
  while (cursor.year < final.year || (cursor.year === final.year && cursor.month <= final.month)) {
    yearMonths.push(formatYearMonth(cursor.year, cursor.month))
    cursor = cursor.month === 12 ? { year: cursor.year + 1, month: 1 } : { year: cursor.year, month: cursor.month + 1 }
  }

  // 月ごとの賞与・イベント・定期項目の金額を一度だけ求め、差引後余剰の計算とテーブル表示
  // (eventItems・bonusAmount・recurringLabels)の両方に使い回す
  const monthlyDetails = yearMonths.map((ym) => {
    const bonusAmount = params.bonuses
      .filter((b) => b.yearMonth === ym)
      .reduce((sum, b) => sum + sanitizeAmount(b.amount), 0)
    const eventItems = params.events
      .filter((e) => e.yearMonth === ym)
      .map((e) => ({ label: e.label, amount: sanitizeAmount(e.amount) }))
    const eventTotal = eventItems.reduce((sum, e) => sum + e.amount, 0)
    const recurringLabels = params.recurringEntries
      .filter((entry) => isRecurringEntryApplicable(entry, ym))
      .map((entry) => ({ label: entry.label, type: entry.type, amount: sanitizeAmount(entry.amount) }))
    const { incomeTotal, expenseTotal } = calcRecurringTotals(params.recurringEntries, ym)
    const netSurplus = calcNetSurplus(params.monthlySurplus, bonusAmount, eventTotal, incomeTotal, expenseTotal)
    return { bonusAmount, eventItems, recurringLabels, netSurplus }
  })

  const netSurpluses = monthlyDetails.map((d) => d.netSurplus)
  const assetSeries = params.investmentMode
    ? buildInvestmentAssetSeries(params.startingAsset, netSurpluses, params.expectedAnnualRate)
    : buildSavingsAssetSeries(params.startingAsset, netSurpluses)

  return yearMonths.map((yearMonth, i) => ({
    yearMonth,
    selfAge: calcAge(params.selfBirthMonth, yearMonth),
    spouseAge: calcAge(params.spouseBirthMonth, yearMonth),
    childrenAges: params.childrenBirthMonths.map((b) => calcAge(b, yearMonth)),
    eventItems: monthlyDetails[i].eventItems,
    bonusAmount: monthlyDetails[i].bonusAmount,
    recurringLabels: monthlyDetails[i].recurringLabels,
    netSurplus: monthlyDetails[i].netSurplus,
    asset: assetSeries[i],
  }))
}
