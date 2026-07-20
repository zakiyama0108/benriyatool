import type {
  AdminRecord,
  Filter,
  Summary,
  Trend,
  SpouseBreakdown,
  ModeBreakdown,
  AssetBreakdown,
  Averages,
} from './types'

// 日別/月別の境界(日)。おおむね2か月=62日以内なら日別で細かく、それより長ければ月別で傾向を見る
// (design.md#集計を組み立てる処理)
const DAY_TREND_MAX_SPAN = 62

// 選択期間の長さから、推移を日別で見せるか月別で見せるかを決める。
// 期間未指定(全期間)や2か月を超える期間は月別にする
export function chooseTrendUnit(fromDate: string | null, toDate: string | null): 'day' | 'month' {
  if (!fromDate || !toDate) return 'month'
  const spanDays = (Date.parse(toDate) - Date.parse(fromDate)) / (24 * 60 * 60 * 1000)
  return spanDays <= DAY_TREND_MAX_SPAN ? 'day' : 'month'
}

// 保存日時(UTC)を日本時間に直し、日別は「YYYY-MM-DD」、月別は「YYYY-MM」のラベルにする
function trendLabel(iso: string, unit: 'day' | 'month'): string {
  const jst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  if (unit === 'month') return `${y}-${m}`
  const d = String(jst.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 保存日時ごとの件数を、日別または月別に数える。点はラベルの昇順で返す
export function buildTrend(records: AdminRecord[], unit: 'day' | 'month'): Trend {
  const counts = new Map<string, number>()
  for (const r of records) {
    const label = trendLabel(r.created_at, unit)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  const points = [...counts.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([label, count]) => ({ label, count }))
  return { unit, points }
}

// 配偶者ありの件数と、全体に占める比率を出す。全体0件のときは比率0
export function aggregateSpouse(records: AdminRecord[]): SpouseBreakdown {
  const total = records.length
  const count = records.filter((r) => r.has_spouse).length
  return { count, ratio: total === 0 ? 0 : count / total }
}

// 運用モード(貯蓄のみ/資産運用)別の件数と、全体に占める比率を出す。全体0件のときは比率0
export function aggregateMode(records: AdminRecord[]): ModeBreakdown {
  const total = records.length
  const investmentCount = records.filter((r) => r.investment_mode).length
  const savingsCount = total - investmentCount
  return {
    investmentCount,
    savingsCount,
    investmentRatio: total === 0 ? 0 : investmentCount / total,
    savingsRatio: total === 0 ? 0 : savingsCount / total,
  }
}

// 最終月時点の資産額の5区分。各区分は「下限以上・上限未満」で、境界値はちょうどのとき上の区分に入る
// (requirements.md#表示の初期値・区切り-2)
const ASSET_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '100万円未満', min: 0, max: 100 },
  { label: '100万円以上500万円未満', min: 100, max: 500 },
  { label: '500万円以上1000万円未満', min: 500, max: 1000 },
  { label: '1000万円以上3000万円未満', min: 1000, max: 3000 },
  { label: '3000万円以上', min: 3000, max: Infinity },
]

// 最終月時点の資産額の平均と、5区分ごとの件数を出す。対象0件のときは平均をnull(算出対象なし)にする
export function aggregateAsset(records: AdminRecord[]): AssetBreakdown {
  const buckets = ASSET_BUCKETS.map((b) => ({
    label: b.label,
    count: records.filter((r) => r.final_month_asset >= b.min && r.final_month_asset < b.max).length,
  }))
  const average =
    records.length === 0
      ? null
      : Math.round(records.reduce((sum, r) => sum + r.final_month_asset, 0) / records.length)
  return { average, buckets }
}

// 月次余剰資金(賞与抜き)の平均を出す。対象0件のときはnull(算出対象なし)
export function aggregateAverages(records: AdminRecord[]): Averages {
  if (records.length === 0) return { monthlySurplus: null }
  const average = Math.round(records.reduce((sum, r) => sum + r.monthly_surplus, 0) / records.length)
  return { monthlySurplus: average }
}

// 絞り込み条件に一致するレコード群から、集計表示に必要な値を一括で組み立てる。
// 推移の日別/月別は、その時の絞り込み期間の長さで決める(design.md#集計を組み立てる処理)
export function buildSummary(records: AdminRecord[], filter: Filter): Summary {
  return {
    count: records.length,
    trend: buildTrend(records, chooseTrendUnit(filter.fromDate, filter.toDate)),
    spouse: aggregateSpouse(records),
    mode: aggregateMode(records),
    asset: aggregateAsset(records),
    averages: aggregateAverages(records),
  }
}
