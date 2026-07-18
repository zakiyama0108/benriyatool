import { calcPaternityBenefit, calcMamaChildcare50 } from '../../lib/calculator'
import { getMamaLeaveStartDate, parseDate, addDays, formatDate } from '../../lib/dateUtils'

// 日額の導出に使う固定の出産予定日。calculator.tsの関数は期間ベースのため、
// 日数が確定する固定期間で呼び出して日額だけを取り出す(日付自体に意味はない)
const PROBE_DUE_DATE = '2026-10-01'

// ガイド記事の早見表に載せる月額給付額。
// 月額 = 上限適用後の賃金日額 × 給付率 の日額 × 30日(雇用保険の支給単位期間が原則30日のため)
export type MonthlyBenefit = {
  month67: number   // 育児休業給付金・最初の180日(67%)の月額
  month50: number   // 育児休業給付金・181日以降(50%)の月額
  month80: number   // 出生後休業支援給付金の上乗せ後(67%+13%)の月額
  capped: boolean   // 賃金日額が上限を超え、上限額を基準に計算した状態か
}

// ビルド失敗ガード: 導出した金額が欠落・非整数・負値なら例外を投げ、
// 誤った数値のまま静的生成・公開されるのを防ぐ
function assertValidAmount(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`ガイド記事の金額導出に失敗: ${label} = ${value}`)
  }
}

// 月給から月額給付額(67%・50%・80%)を導出する。
// calculator.tsの公開関数のみを使い、本体の内部定数には依存しない:
// - 67%と13%の日額: 出生時育児休業給付金(28日固定)の総額から逆算
// - 50%の日額: ママ育休181日目ちょうど1日だけの期間を作って取り出す
export function calcMonthlyBenefit(monthlySalary: number): MonthlyBenefit {
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) {
    throw new Error(`ガイド記事の月額計算に不正な月給が渡されました: ${monthlySalary}`)
  }

  const paternity = calcPaternityBenefit({ monthlySalary, dueDate: PROBE_DUE_DATE, paternityDays: 28 })
  const daily67 = paternity.amount / 28
  const daily13 = (paternity.bonusAmount ?? 0) / 28

  const leaveStartDate = getMamaLeaveStartDate(PROBE_DUE_DATE)
  const day181 = formatDate(addDays(parseDate(leaveStartDate), 180))
  const childcare50 = calcMamaChildcare50({ monthlySalary, dueDate: PROBE_DUE_DATE, leaveEndDate: day181 })
  if (childcare50 === null || childcare50.days !== 1) {
    throw new Error('ガイド記事の50%日額の導出に失敗: 1日分の期間指定が成立していません')
  }
  const daily50 = childcare50.amount

  const result: MonthlyBenefit = {
    month67: daily67 * 30,
    month50: daily50 * 30,
    month80: (daily67 + daily13) * 30,
    capped: paternity.dailyLimitReached,
  }
  assertValidAmount(result.month67, '67%月額')
  assertValidAmount(result.month50, '50%月額')
  assertValidAmount(result.month80, '80%月額')
  return result
}

// 賃金日額の上限に引っかかるかどうかの判定だけを返す(探索用の軽量版)
function isCapped(monthlySalary: number): boolean {
  return calcPaternityBenefit({ monthlySalary, dueDate: PROBE_DUE_DATE, paternityDays: 28 }).dailyLimitReached
}

// 「手取り10割にならない月給ライン」の導出結果
export type CapSalaryLine = {
  capSalary: number       // 上限適用となる最小の月給(このライン以上は給付額が頭打ち)
  cappedDailyWage: number // 賃金日額の上限額(上限未適用の最大月給から逆算した値)
}

// 上限適用となる最小月給を二分探索で特定する。
// calculator.tsの上限定数は非公開のため、上限適用フラグの反転点を探して導出する
// (定数改定時もコード変更なしで新しいラインに追随する)
export function findCapSalaryLine(): CapSalaryLine {
  let low = 1              // 上限未適用が確実な下端
  let high = 10_000_000    // 上限適用が確実な上端(月給1000万円)
  if (isCapped(low) || !isCapped(high)) {
    throw new Error('ガイド記事の上限ライン探索に失敗: 探索範囲の前提が崩れています')
  }
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2)
    if (isCapped(mid)) {
      high = mid
    } else {
      low = mid
    }
  }
  // high = 上限適用となる最小月給。上限未適用の最大月給(high - 1)の賃金日額 = 上限額
  return { capSalary: high, cappedDailyWage: Math.floor((high - 1) / 30) }
}

// 就労時の手取り概算率。社会保険料の本人負担(約14〜15%)+所得税・住民税(約5〜6%)で
// 控除合計が約2割になる一般的な目安から、額面の80%を手取りとみなす
// (厳密な手取り計算はスコープ外。この前提は各記事の本文に明記する)
export const WORKING_NET_INCOME_RATE = 0.8

// 就労時の手取り(概算)を返す。「手取り10割」比較・世帯収入試算の就労月に使う
export function estimateWorkingNetIncome(monthlySalary: number): number {
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) {
    throw new Error(`ガイド記事の手取り概算に不正な月給が渡されました: ${monthlySalary}`)
  }
  const net = monthlySalary * WORKING_NET_INCOME_RATE
  assertValidAmount(net, '就労時手取り概算')
  return net
}
