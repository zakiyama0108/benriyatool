import { calcMamaChildcare50, calcMamaChildcare67, calcMaternityBenefit, calcPaternityBenefit } from '../../lib/calculator'
import { addDays, formatDate, getMaternityStartDate, parseDate } from '../../lib/dateUtils'
import type { BenefitItem } from '../../lib/types'
import { estimateWorkingNetIncome } from './monthlyBenefit'

// 記事3の世帯モデル(記事本文の前提として明記する)。
// ママ育休は「子が1歳になる頃まで」として出産予定日のほぼ1年後を終了日にする
export const HOUSEHOLD_MODEL = {
  papaSalary: 350000,
  mamaSalary: 280000,
  dueDate: '2026-10-01',
  mamaLeaveEndDate: '2027-09-30',
}
export type HouseholdModel = typeof HOUSEHOLD_MODEL

// パターンA: ママのみ育休 / B: ママ+パパ28日 / C: ママ+パパ14日(同時期はママ産休)
export type HouseholdPattern = 'A' | 'B' | 'C'

// パターンごとのパパの産後パパ育休日数
const PAPA_LEAVE_DAYS: Record<HouseholdPattern, number> = { A: 0, B: 28, C: 14 }

// 出生後休業支援給付金は夫婦それぞれ14日以上の取得が要件。
// パパが取らないパターンAでは夫婦とも上乗せを計上しない(requirements.md#出生後休業支援給付金の計上条件)
function includesBonus(pattern: HouseholdPattern): boolean {
  return PAPA_LEAVE_DAYS[pattern] >= 14
}

export type MonthlyHouseholdIncome = {
  month: string   // 'YYYY-MM'
  papa: number
  mama: number
  total: number
}

export type HouseholdSimulation = {
  rows: MonthlyHouseholdIncome[]
  total: number
  bonusTotal: { papa: number; mama: number }  // 出生後休業支援給付金の計上額(検証用の内訳)
}

// 発生ベースで暦月に日割り配分する収入区間(1日あたりの額は整数になる前提)
type IncomeSegment = { startDate: string; endDate: string; daily: number }

// 給付を「本体」と「上乗せ(対象期間=最初の最大28日への日割り)」の区間に分解する
function toSegments(benefit: BenefitItem, withBonus: boolean): IncomeSegment[] {
  const segments: IncomeSegment[] = [
    { startDate: benefit.startDate, endDate: benefit.endDate, daily: benefit.amount / benefit.days },
  ]
  if (withBonus && benefit.bonusAmount) {
    const bonusDays = Math.min(28, benefit.days)
    segments.push({
      startDate: benefit.startDate,
      endDate: formatDate(addDays(parseDate(benefit.startDate), bonusDays - 1)),
      daily: benefit.bonusAmount / bonusDays,
    })
  }
  return segments
}

// 両端を含む2つの日付区間の重なり日数
function overlapDays(startA: Date, endA: Date, startB: Date, endB: Date): number {
  const start = startA > startB ? startA : startB
  const end = endA < endB ? endA : endB
  if (start > end) return 0
  return Math.round((end.getTime() - start.getTime()) / (86400 * 1000)) + 1
}

// 'YYYY-MM' 形式の月キーの一覧を、開始日の月から終了日の月まで生成する
function listMonths(startDate: string, endDate: string): { key: string; first: Date; last: Date }[] {
  const months = []
  let cursor = parseDate(startDate)
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const limit = parseDate(endDate)
  while (cursor <= limit) {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    months.push({
      key: `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}`,
      first,
      last,
    })
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
  }
  return months
}

// 1人分の月次収入を組み立てる。
// 休業期間は給付の日割り、就労日は手取り概算(額面の8割)を月の日数比で按分する
function personMonthlyIncome(
  months: { key: string; first: Date; last: Date }[],
  benefits: BenefitItem[],
  withBonus: boolean,
  leaveRanges: { start: Date; end: Date }[],
  monthlyNet: number,
): { byMonth: Map<string, number>; bonusTotal: number } {
  const segments = benefits.flatMap((benefit) => toSegments(benefit, withBonus))
  const bonusTotal = withBonus
    ? benefits.reduce((sum, benefit) => sum + (benefit.bonusAmount ?? 0), 0)
    : 0

  const byMonth = new Map<string, number>()
  for (const month of months) {
    const daysInMonth = month.last.getDate()
    let income = 0
    for (const segment of segments) {
      income += segment.daily * overlapDays(parseDate(segment.startDate), parseDate(segment.endDate), month.first, month.last)
    }
    const leaveDays = leaveRanges.reduce(
      (sum, range) => sum + overlapDays(range.start, range.end, month.first, month.last),
      0,
    )
    const workingDays = daysInMonth - leaveDays
    income += Math.round((monthlyNet * workingDays) / daysInMonth)

    if (!Number.isFinite(income) || income < 0) {
      throw new Error(`世帯シミュレーションの月次収入が不正です: ${month.key} = ${income}`)
    }
    byMonth.set(month.key, income)
  }
  return { byMonth, bonusTotal }
}

// パターン別に世帯収入の月次推移を組み立てる(ビルド時に実行し、記事のHTMLに焼き込む)
export function simulateHousehold(pattern: HouseholdPattern, model: HouseholdModel = HOUSEHOLD_MODEL): HouseholdSimulation {
  const { papaSalary, mamaSalary, dueDate, mamaLeaveEndDate } = model
  // 就労手取り概算が先に月給を検証する(不正値はここで例外=ビルド失敗)
  const papaNet = estimateWorkingNetIncome(papaSalary)
  const mamaNet = estimateWorkingNetIncome(mamaSalary)
  const withBonus = includesBonus(pattern)

  // ママ: 産休(出産手当金)→育休67%→(181日目以降)50% の連続した休業
  const maternity = calcMaternityBenefit({ monthlySalary: mamaSalary, dueDate })
  const mamaC67 = calcMamaChildcare67({ monthlySalary: mamaSalary, dueDate, leaveEndDate: mamaLeaveEndDate })
  const mamaC50 = calcMamaChildcare50({ monthlySalary: mamaSalary, dueDate, leaveEndDate: mamaLeaveEndDate })
  // 出産手当金には上乗せ制度がないため、ママの上乗せは育休(67%期間)のみ
  const mamaBenefits = [maternity, mamaC67, ...(mamaC50 ? [mamaC50] : [])]
  const mamaLeave = [{ start: parseDate(getMaternityStartDate(dueDate)), end: parseDate(mamaLeaveEndDate) }]

  // パパ: 産後パパ育休のみ(パターンAは取得なし)。復帰後は就労
  const papaDays = PAPA_LEAVE_DAYS[pattern]
  const papaBenefits: BenefitItem[] =
    papaDays > 0 ? [calcPaternityBenefit({ monthlySalary: papaSalary, dueDate, paternityDays: papaDays })] : []
  const papaLeave =
    papaDays > 0
      ? [{ start: parseDate(dueDate), end: parseDate(formatDate(addDays(parseDate(dueDate), papaDays - 1))) }]
      : []

  // 試算期間: 産休開始月〜ママ育休終了月
  const months = listMonths(getMaternityStartDate(dueDate), mamaLeaveEndDate)

  const mama = personMonthlyIncome(months, mamaBenefits, withBonus, mamaLeave, mamaNet)
  const papa = personMonthlyIncome(months, papaBenefits, withBonus, papaLeave, papaNet)

  const rows = months.map((month) => {
    const papaIncome = papa.byMonth.get(month.key) ?? 0
    const mamaIncome = mama.byMonth.get(month.key) ?? 0
    return { month: month.key, papa: papaIncome, mama: mamaIncome, total: papaIncome + mamaIncome }
  })

  return {
    rows,
    total: rows.reduce((sum, row) => sum + row.total, 0),
    bonusTotal: { papa: papa.bonusTotal, mama: mama.bonusTotal },
  }
}

// 3パターンの累計とパターンAとの差額(記事の「差額まとめ」用)
export function comparePatterns(model: HouseholdModel = HOUSEHOLD_MODEL): {
  totals: Record<HouseholdPattern, number>
  diffFromA: { B: number; C: number }
} {
  const totals = {
    A: simulateHousehold('A', model).total,
    B: simulateHousehold('B', model).total,
    C: simulateHousehold('C', model).total,
  }
  return { totals, diffFromA: { B: totals.B - totals.A, C: totals.C - totals.A } }
}
