// 管理画面が扱う life_money_sim_results の1レコード。保存カラムの定義は
// specs/life-money-sim/save-result/design.md#データベース設計 に対応する
export type AdminRecord = {
  id: string
  created_at: string // 保存日時(ISO8601)
  has_spouse: boolean
  children_count: number
  monthly_salary: number // 万円
  personal_expense_monthly: number // 万円
  household_expense_total: number | null // 万円。配偶者なしはnull
  my_household_share: number | null // 万円。配偶者なしはnull
  starting_asset: number // 万円
  investment_mode: boolean
  expected_annual_rate: number | null // %。貯蓄のみモードはnull
  event_count: number
  final_month_asset: number // 万円
  monthly_surplus: number // 万円
  is_test: boolean
}

// 一覧・集計の絞り込み条件。期間は未指定(全期間)をnullで表す
export type Filter = {
  fromDate: string | null // 保存日時の期間開始(YYYY-MM-DD・含む)。未指定はnull
  toDate: string | null // 保存日時の期間終了(YYYY-MM-DD・含む)。未指定はnull
  includeTest: boolean // テストデータを表示に含めるか(初期値はfalse=除外)
}

// 絞り込みの初期値(design.md#状態管理: 期間=全期間・テストデータ=除外)
export const DEFAULT_FILTER: Filter = {
  fromDate: null,
  toDate: null,
  includeTest: false,
}

// 期間推移の1点(日別または月別の件数)
export type TrendPoint = {
  label: string // 日別は「YYYY-MM-DD」、月別は「YYYY-MM」
  count: number
}

// 期間推移の集計結果
export type Trend = {
  unit: 'day' | 'month'
  points: TrendPoint[]
}

// 配偶者ありの件数と、全体に占める割合
export type SpouseBreakdown = {
  count: number
  ratio: number // 0〜1。全体0件のときは0
}

// 運用モード(貯蓄のみ/資産運用)別の件数と比率
export type ModeBreakdown = {
  investmentCount: number
  savingsCount: number
  investmentRatio: number // 0〜1。全体0件のときは0
  savingsRatio: number
}

// 最終月時点の資産額の平均と、金額帯別の分布
export type AssetBreakdown = {
  average: number | null // 万円。対象0件のときはnull
  buckets: { label: string; count: number }[]
}

// 月次余剰資金(賞与抜き)の平均
export type Averages = {
  monthlySurplus: number | null // 万円。対象0件のときはnull
}

// 集計表示全体
export type Summary = {
  count: number
  trend: Trend
  spouse: SpouseBreakdown
  mode: ModeBreakdown
  asset: AssetBreakdown
  averages: Averages
}
