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
    <div className="h-64 w-full rounded-[35px] border border-lms-line-strong bg-lms-card p-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="assetGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-lms-teal)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-lms-teal)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-lms-line)" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} />
          {/* ツールチップはホバー時に一瞬確認する用途のため整数丸めで表示する(小数第1位まで残すAssetProjectionTable.tsx/HeroCard.tsxのformatManYenとは意図的に精度を変えている) */}
          <Tooltip formatter={(value) => [`${Math.round(Number(value))}万円`, '資産額']} />
          <Area type="monotone" dataKey="asset" stroke="var(--color-lms-teal)" fill="url(#assetGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
