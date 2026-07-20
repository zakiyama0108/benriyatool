'use client'
import type { MonthlyProjectionRow, YearlyProjectionRow, PeriodUnit } from '../lib/types'

type Props = {
  periodUnit: PeriodUnit
  monthlyRows: MonthlyProjectionRow[]
  yearlyRows: YearlyProjectionRow[]
}

function formatManYen(amount: number): string {
  return `${Math.round(amount * 10) / 10}万円`
}

function formatAge(age: number | undefined): string {
  return age === undefined ? '—' : `${age}歳`
}

// 月次/年次の年齢・イベント名目・差引後余剰(または年次余剰資金)・資産推移累計額を表形式で表示する
// (仕様: requirements.md#月次の資産推移、requirements.md#表示単位の切り替え-2)
export default function AssetProjectionTable({ periodUnit, monthlyRows, yearlyRows }: Props) {
  if (periodUnit === 'month') {
    return (
      <div className="overflow-x-auto rounded-[20px] bg-white p-2 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-teal-100 text-left text-teal-700">
              <th className="whitespace-nowrap px-2 py-1 font-medium">年月</th>
              <th className="whitespace-nowrap px-2 py-1 font-medium">本人</th>
              <th className="whitespace-nowrap px-2 py-1 font-medium">配偶者</th>
              <th className="whitespace-nowrap px-2 py-1 font-medium">子ども</th>
              <th className="whitespace-nowrap px-2 py-1 font-medium">イベント</th>
              <th className="whitespace-nowrap px-2 py-1 font-medium">差引後余剰</th>
              <th className="whitespace-nowrap px-2 py-1 font-medium">資産額</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map((row) => (
              <tr key={row.yearMonth} className="border-b border-teal-50">
                <td className="whitespace-nowrap px-2 py-1">{row.yearMonth}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatAge(row.selfAge)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatAge(row.spouseAge)}</td>
                <td className="whitespace-nowrap px-2 py-1">{row.childrenAges.map(formatAge).join(' / ') || '—'}</td>
                <td className="whitespace-nowrap px-2 py-1 text-rose-500">{row.eventLabels.join('、') || '—'}</td>
                <td className="whitespace-nowrap px-2 py-1 tabular-nums text-amber-700">{formatManYen(row.netSurplus)}</td>
                <td className="whitespace-nowrap px-2 py-1 font-bold tabular-nums text-teal-700">{formatManYen(row.asset)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-[20px] bg-white p-2 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-teal-100 text-left text-teal-700">
            <th className="whitespace-nowrap px-2 py-1 font-medium">年</th>
            <th className="whitespace-nowrap px-2 py-1 font-medium">本人</th>
            <th className="whitespace-nowrap px-2 py-1 font-medium">配偶者</th>
            <th className="whitespace-nowrap px-2 py-1 font-medium">子ども</th>
            <th className="whitespace-nowrap px-2 py-1 font-medium">イベント</th>
            <th className="whitespace-nowrap px-2 py-1 font-medium">年次余剰資金</th>
            <th className="whitespace-nowrap px-2 py-1 font-medium">資産額</th>
          </tr>
        </thead>
        <tbody>
          {yearlyRows.map((row) => (
            <tr key={row.year} className="border-b border-teal-50">
              <td className="whitespace-nowrap px-2 py-1">{row.year}年</td>
              <td className="whitespace-nowrap px-2 py-1">{formatAge(row.selfAge)}</td>
              <td className="whitespace-nowrap px-2 py-1">{formatAge(row.spouseAge)}</td>
              <td className="whitespace-nowrap px-2 py-1">{row.childrenAges.map(formatAge).join(' / ') || '—'}</td>
              <td className="whitespace-nowrap px-2 py-1 text-rose-500">{row.eventLabels.join('、') || '—'}</td>
              <td className="whitespace-nowrap px-2 py-1 tabular-nums text-amber-700">{formatManYen(row.yearlySurplus)}</td>
              <td className="whitespace-nowrap px-2 py-1 font-bold tabular-nums text-teal-700">{formatManYen(row.asset)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
