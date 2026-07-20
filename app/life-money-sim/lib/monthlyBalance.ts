import type { ExpenseItem } from './types'

// 金額の入力バリデーション。0未満・数値でない(NaN等)入力は0として扱い、
// 他の入力欄の計算をブロックしない(仕様: design.md#バリデーション)
function sanitizeAmount(amount: number): number {
  return Number.isFinite(amount) && amount >= 0 ? amount : 0
}

function sumExpenseItems(items: ExpenseItem[]): number {
  return items.reduce((sum, item) => sum + sanitizeAmount(item.amount), 0)
}

// 年額固定費を月換算(12で割る)した金額と月額固定費を合算し、「個人支出の月合計」を求める
// (仕様: requirements.md#個人支出-3、requirements.md#ビジネスルール・制約-1、design.md#個人支出の月合計を計算する処理)
export function calcPersonalExpenseMonthly(annualItems: ExpenseItem[], monthlyItems: ExpenseItem[]): number {
  const annualTotalMonthly = sumExpenseItems(annualItems) / 12
  const monthlyTotal = sumExpenseItems(monthlyItems)
  return annualTotalMonthly + monthlyTotal
}

// 家計支出全体の合計(配偶者ありの場合の内訳リストの合計)。配偶者なしの場合は0とする
// (仕様: requirements.md#家計支出-1)
export function calcHouseholdExpenseTotal(hasSpouse: boolean, items: ExpenseItem[]): number {
  if (!hasSpouse) return 0
  return sumExpenseItems(items)
}

// 配偶者の有無を踏まえた月次余剰資金(賞与抜き)を計算する。
// 配偶者なしの場合は家計負担額を0として扱う(仕様: requirements.md#家計支出-1、requirements.md#余剰資金の計算-1、
// design.md#家計負担を反映した月次余剰資金を計算する処理)
export function calcMonthlySurplus(
  monthlySalary: number,
  personalExpenseMonthly: number,
  hasSpouse: boolean,
  myShare: number
): number {
  const householdShare = hasSpouse ? sanitizeAmount(myShare) : 0
  return sanitizeAmount(monthlySalary) - personalExpenseMonthly - householdShare
}

// 月次余剰資金(賞与抜き)を12倍し、手取りボーナスの年間合計を足して「年間余剰資金」を求める
// (仕様: requirements.md#余剰資金の計算-2)
export function calcAnnualSurplus(monthlySurplus: number, bonusCount: number, bonusAmountPerTime: number): number {
  const bonusTotal = sanitizeAmount(bonusCount) * sanitizeAmount(bonusAmountPerTime)
  return monthlySurplus * 12 + bonusTotal
}

// 個人支出の月合計と自分の家計負担額の合計(支出合計)が、手取り月給に占める割合(0〜1)を求める。
// 手取り月給が0の場合は割り算が成立しないため「算出対象なし」を表すnullを返す
// (仕様: requirements.md#余剰資金の計算-4、design.md#支出割合を計算する処理)
export function calcExpenseRatio(
  personalExpenseMonthly: number,
  hasSpouse: boolean,
  myShare: number,
  monthlySalary: number
): number | null {
  const salary = sanitizeAmount(monthlySalary)
  if (salary === 0) return null
  const householdShare = hasSpouse ? sanitizeAmount(myShare) : 0
  const totalExpense = personalExpenseMonthly + householdShare
  return totalExpense / salary
}
