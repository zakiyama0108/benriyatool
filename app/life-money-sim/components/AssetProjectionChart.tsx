'use client'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { MonthlyProjectionRow, YearlyProjectionRow, PeriodUnit } from '../lib/types'

type Props = {
  periodUnit: PeriodUnit
  monthlyRows: MonthlyProjectionRow[]
  yearlyRows: YearlyProjectionRow[]
}

// 選択中の表示単位(月次/年次)と同じ粒度のデータ点で資産額の推移をエリアグラフで表示する
// (仕様: requirements.md#資産推移グラフ-1、requirements.md#資産推移グラフ-2)
export default function AssetProjectionChart({ periodUnit, monthlyRows, yearlyRows }: Props) {
  const data =
    periodUnit === 'month'
      ? monthlyRows.map((r) => ({ label: r.yearMonth, asset: r.asset }))
      : yearlyRows.map((r) => ({ label: `${r.year}年`, asset: r.asset }))

  return (
    <div className="h-64 w-full rounded-[20px] bg-white p-4 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0f766e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#0f766e" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ccfbf1" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip formatter={(value) => `${String(value)}万円`} />
          <Area type="monotone" dataKey="asset" stroke="#0f766e" fill="url(#assetGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
