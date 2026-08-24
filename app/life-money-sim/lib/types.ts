// 入力金額の単位は万円で統一する(仕様: requirements.md#ビジネスルール・制約-2)。
// 画面表示・計算・保存(save-result)まで一貫して万円のまま扱う

// 名称+金額のペアの内訳項目。年額固定費・月額固定費・家計支出項目で共通利用する
export type ExpenseItem = {
  name: string
  amount: number // 万円。負数・NaN等の不正値は計算時に0として扱う(design.md#バリデーション)
}

// 収入の入力(手取り月給・手取りボーナス)
export type IncomeInput = {
  monthlySalary: number // 手取り月給・万円
  bonusMonths: number[] // 手取りボーナスの支給月(1〜12)。年間支給回数は要素数で決まる(仕様: monthly-balance/requirements.md#収入-2)
  bonusAmountPerTime: number // 手取りボーナス1回あたりの金額・万円
}

// 個人支出の入力(年額固定費・月額固定費)
export type PersonalExpenseInput = {
  annualItems: ExpenseItem[] // 年に1回程度発生する個人の支出
  monthlyItems: ExpenseItem[] // 毎月発生する個人の支出
}

// 家計支出の入力(配偶者ありの場合のみ意味を持つ)
export type HouseholdExpenseInput = {
  hasSpouse: boolean
  items: ExpenseItem[] // 毎月の家計支出項目(配偶者ありの場合のみ入力)
  myShare: number // 家計支出全体に対する自分の毎月の負担額・万円
}

// 年月は "YYYY-MM" 形式の文字列で統一する(月次資産推移テーブルの各行・生年月・開始年月で共通)
export type YearMonth = string

// 前提入力(資産推移タブ)。配偶者の有無は収支タブの家計支出セクションと同じ状態を共有する
export type FamilyProfileInput = {
  selfBirthMonth: YearMonth | null // 本人の生年月。任意入力(仕様: requirements.md#前提入力-3)
  spouseBirthMonth: YearMonth | null // 配偶者の生年月。任意入力
  childrenCount: number // 子どもの人数(0〜3人)
  childrenBirthMonths: (YearMonth | null)[] // 子どもそれぞれの生年月。childrenCount分の要素を持つ。任意入力
}

// シミュレーション開始資産額・開始年月・表示範囲(年数)の入力
export type StartingAssetInput = {
  startingAsset: number // シミュレーション開始資産額・万円
  startYearMonth: YearMonth
  displayYears: number // 表示範囲(年数)。1以上の整数以外は初期値30にフォールバックする(requirements.md#前提入力-7)
}

// 特定の月に登録する一時的な追加支出(イベント)
export type EventEntry = {
  yearMonth: YearMonth
  label: string // 名目(自由テキスト)
  amount: number // 万円
}

// 特定の月に登録する賞与(通常の年間ボーナスとは別に、または上書きして登録する)
export type BonusEntry = {
  yearMonth: YearMonth
  amount: number // 万円
}

// 貯蓄のみ/資産運用モードの切り替えと、資産運用モードの想定利回り
export type InvestmentModeInput = {
  investmentMode: boolean // true: 資産運用モード, false: 貯蓄のみモード
  expectedAnnualRate: number // 想定利回り(年率・%)。資産運用モード選択時のみ意味を持つ
}

// 定期的な収入・支出の種別(仕様: requirements.md#定期的な収入・支出の登録-2)
export type RecurringEntryType = 'income' | 'expense'

// 開始月・終了月・頻度(何ヶ月ごとか)を指定して、一定期間繰り返し発生する収入・支出の登録
// (仕様: requirements.md#定期的な収入・支出の登録-1、#定期的な収入・支出の登録-2、#定期的な収入・支出の登録-3)
export type RecurringEntry = {
  label: string // 名目(自由テキスト)
  amount: number // 万円
  type: RecurringEntryType
  startYearMonth: YearMonth
  endYearMonth: YearMonth // 終了月は必須入力(requirements.md#定期的な収入・支出の登録-3)
  frequencyMonths: number // 何ヶ月ごとか。1以上の整数以外は初期値1にフォールバックする(requirements.md#定期項目の頻度の正規化-1)
}

// 資産推移テーブル・グラフの表示単位
export type PeriodUnit = 'month' | 'year'

// 該当した定期項目の名目1件。種別を保持するのは、テーブル表示で定期収入(賞与と同じティール文字)/
// 定期支出(イベントと同じコーラル文字)を色分けするため(仕様: design.md#ビジュアルトーン)。
// amountは月次行ではその月の金額、年次行では名目・種別ごとに集約したその年の該当月合計額
// (仕様: requirements.md#定期的な収入・支出の登録-6、design.md#月次データを年次にまとめる処理)
export type RecurringLabel = {
  label: string
  type: RecurringEntryType
  amount: number
}

// 資産推移テーブルに表示する、名目+金額のイベント1件
// (仕様: requirements.md#賞与・イベントの登録-3、design.md#資産推移テーブルに金額を表示する処理)
export type EventItem = {
  label: string
  amount: number
}

// 月次資産推移テーブルの1行
export type MonthlyProjectionRow = {
  yearMonth: YearMonth
  selfAge?: number
  spouseAge?: number
  childrenAges: (number | undefined)[]
  eventItems: EventItem[] // その月に発生したイベントの名目・金額一覧
  bonusAmount: number // その月に登録された賞与の合計額・万円。0は登録なし(仕様: requirements.md#賞与・イベントの登録-4)
  recurringLabels: RecurringLabel[] // その月に該当した定期収入・定期支出の名目・金額一覧(仕様: requirements.md#定期的な収入・支出の登録-6)
  netSurplus: number // 差引後余剰・万円
  investmentGain: number // その月の運用益・万円。貯蓄のみモードは0(仕様: requirements.md#月次の資産推移-6)
  asset: number // その月末時点の資産額・万円
}

// 資産推移テーブルの年次集計行
export type YearlyProjectionRow = {
  year: number
  selfAge?: number
  spouseAge?: number
  childrenAges: (number | undefined)[]
  eventItems: EventItem[] // その年に発生したイベントの名目・金額一覧(同じ名目でも合算せずすべて集める)
  bonusAmount: number // その年に該当した賞与の合計額・万円
  recurringLabels: RecurringLabel[] // その年に該当した定期収入・定期支出を名目・種別ごとに合算した一覧
  yearlySurplus: number // 年次余剰資金・万円
  investmentGain: number // その年の運用益の合計・万円。貯蓄のみモードは0(仕様: requirements.md#月次の資産推移-6)
  asset: number // 年末(またはその年の最終月)時点の資産額・万円
}

// 「この試算を保存する」ボタン押下時に集める、保存対象の入力・計算結果
// (仕様: save-result/requirements.md#機能要件-1)
export type SaveResultInput = {
  hasSpouse: boolean
  childrenCount: number
  monthlySalary: number
  personalExpenseMonthly: number
  householdExpenseTotal: number // 配偶者なしの場合は0(保存時にhasSpouseを見てnull化する)
  myHouseholdShare: number // 配偶者なしの場合は0(保存時にhasSpouseを見てnull化する)
  startingAsset: number
  investmentMode: boolean
  expectedAnnualRate: number // 貯蓄のみモードの場合は保存時にnull化する
  eventCount: number
  finalMonthAsset: number
  monthlySurplus: number
}

// life_money_sim_resultsテーブルへ保存するレコード(カラム定義: save-result/design.md#データベース設計)
export type ResultRecord = {
  has_spouse: boolean
  children_count: number
  monthly_salary: number
  personal_expense_monthly: number
  household_expense_total: number | null
  my_household_share: number | null
  starting_asset: number
  investment_mode: boolean
  expected_annual_rate: number | null
  event_count: number
  final_month_asset: number
  monthly_surplus: number
  is_test: boolean
}

// マイシナリオ(saved-scenario)の保存対象の入力値一式(仕様: saved-scenario/design.md#保存対象の入力値)
export type ScenarioInputState = {
  income: IncomeInput
  personalExpense: PersonalExpenseInput
  household: HouseholdExpenseInput
  familyProfile: FamilyProfileInput
  startingAssetInput: StartingAssetInput
  bonuses: BonusEntry[]
  events: EventEntry[]
  recurringEntries: RecurringEntry[]
  investmentModeInput: InvestmentModeInput
}

// life_money_sim_saved_scenariosテーブルの1件(カラム定義: saved-scenario/design.md#データベース設計)
export type ScenarioRecord = {
  id: string
  name: string
  inputState: ScenarioInputState
  createdAt: string
}
