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
    <div className="space-y-4 rounded-[18px] bg-white p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
      <p className="text-sm font-bold text-[#1C2A28]">収支サマリー</p>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#7E9491]">
        <span>
          個人支出の月合計 <b className="tabular-nums text-[#1C2A28]">{formatManYen(personalExpenseMonthly)}</b>
        </span>
        {hasSpouse && (
          <span>
            家計支出全体の合計 <b className="tabular-nums text-[#1C2A28]">{formatManYen(householdExpenseTotal)}</b>
          </span>
        )}
      </div>

      <div className="inline-flex items-baseline gap-1.5 rounded-full bg-[#FDECC9] px-4 py-2 text-xs font-bold text-[#8A5E0E]">
        <span>収入に対する支出割合</span>
        <b className="text-base">{expenseRatio === null ? '算出対象なし' : `${Math.round(expenseRatio * 100)}%`}</b>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 rounded-[14px] bg-[#DAF3EF] px-4 py-3.5">
          <p className="text-xs font-semibold text-[#7E9491]">月次余剰資金(賞与抜き)</p>
          <p className="mt-0.5 text-xl font-extrabold tabular-nums text-[#0f6f65]">{formatManYen(monthlySurplus)}</p>
        </div>
        <div className="flex-1 rounded-[14px] border border-[#C1E1DB] bg-white px-4 py-3.5">
          <p className="text-xs font-semibold text-[#7E9491]">年間余剰資金</p>
          <p className="mt-0.5 text-xl font-extrabold tabular-nums text-[#1C2A28]">{formatManYen(annualSurplus)}</p>
        </div>
      </div>
    </div>
  )
}
