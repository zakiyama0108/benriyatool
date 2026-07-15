// 管理画面が扱う ikukyu_results の1レコード。保存カラムの定義は
// specs/ikukyu/save-result/design.md#ikukyu_results に対応する
export type AdminRecord = {
  id: string
  created_at: string        // 保存日時（ISO8601）
  mode: 'mama' | 'papa'
  monthly_salary: number    // 月給・円
  due_date: string          // 出産予定日（YYYY-MM-DD）
  leave_start_date: string | null  // 育休開始日（パパのみ・未入力/ママはnull）
  leave_end_date: string    // 育休終了予定日（YYYY-MM-DD）
  total_amount: number      // 合計給付額・円
  total_leave_days: number  // 合計取得日数
  is_test: boolean          // テスト・動作確認データの判別フラグ
}

// 一覧・集計の絞り込み条件。期間は未指定（全期間）をnullで表す
export type Filter = {
  fromDate: string | null   // 保存日時の期間開始（YYYY-MM-DD・含む）。未指定はnull
  toDate: string | null     // 保存日時の期間終了（YYYY-MM-DD・含む）。未指定はnull
  includeTest: boolean      // テストデータを表示に含めるか（初期値はfalse=除外）
}

// 絞り込みの初期値（design.md#状態管理: 期間=全期間・テストデータ=除外）
export const DEFAULT_FILTER: Filter = {
  fromDate: null,
  toDate: null,
  includeTest: false,
}

// 期間推移の1点（日別または月別の件数）
export type TrendPoint = {
  label: string  // 日別は「YYYY-MM-DD」、月別は「YYYY-MM」
  count: number
}

// 期間推移の集計結果
export type Trend = {
  unit: 'day' | 'month'
  points: TrendPoint[]
}

// モード（ママ/パパ）別の件数と比率
export type ModeBreakdown = {
  mamaCount: number
  papaCount: number
  mamaRatio: number  // 全体に占める割合（0〜1）。全体0件のときは0
  papaRatio: number
}

// 月給の平均と金額帯別の分布
export type SalaryBreakdown = {
  average: number | null       // 平均月給・円。対象0件のときはnull
  buckets: { label: string; count: number }[]  // 5区分ごとの件数
}

// 給付額・取得日数の平均
export type Averages = {
  totalAmount: number | null      // 平均合計給付額・円。対象0件のときはnull
  totalLeaveDays: number | null   // 平均合計取得日数。対象0件のときはnull
}

// 集計表示全体
export type Summary = {
  count: number
  trend: Trend
  mode: ModeBreakdown
  salary: SalaryBreakdown
  averages: Averages
}
