'use client'

type Props = {
  personalExpenseMonthly: number
  householdExpenseTotal: number
  hasSpouse: boolean
  expenseRatio: number | null
  monthlySurplus: number
  annualSurplus: number
}

function formatManYen(amount: number): string {
  return `${Math.round(amount * 10) / 10}万円`
}

// 個人支出月合計・家計支出合計・支出割合・月次/年間余剰資金の計算結果表示
// (仕様: requirements.md#余剰資金の計算-3、#余剰資金の計算-4)
export default function BalanceSummary({
  personalExpenseMonthly,
  householdExpenseTotal,
  hasSpouse,
  expenseRatio,
  monthlySurplus,
  annualSurplus,
}: Props) {
  return (
    <div className="space-y-3 rounded-[20px] bg-white p-4 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
      <p className="text-sm font-bold text-teal-800">収支サマリー</p>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-gray-500">個人支出の月合計</dt>
          <dd className="font-bold tabular-nums text-rose-500">{formatManYen(personalExpenseMonthly)}</dd>
        </div>
        {hasSpouse && (
          <div>
            <dt className="text-xs text-gray-500">家計支出全体の合計</dt>
            <dd className="font-bold tabular-nums text-rose-500">{formatManYen(householdExpenseTotal)}</dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-gray-500">支出割合</dt>
          <dd className="font-bold tabular-nums text-rose-500">
            {expenseRatio === null ? '算出対象なし' : `${Math.round(expenseRatio * 100)}%`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">月次余剰資金(賞与抜き)</dt>
          <dd className="font-bold tabular-nums text-teal-600">{formatManYen(monthlySurplus)}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">年間余剰資金</dt>
          <dd className="font-bold tabular-nums text-teal-600">{formatManYen(annualSurplus)}</dd>
        </div>
      </dl>
    </div>
  )
}
