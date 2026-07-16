'use client'
import type { Summary } from '../lib/types'
import { formatYen, formatDays } from '../lib/format'

type Props = {
  summary: Summary
}

// 比率(0〜1)をパーセント表示にする
function toPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

// 平均値。算出対象なし(null)のときは空であることが分かる記号にする
function avgYen(v: number | null): string {
  return v === null ? '—' : formatYen(v)
}
function avgDays(v: number | null): string {
  return v === null ? '—' : formatDays(v)
}

// 集計表示。件数・推移・モード比率・月給の平均と分布・給付額/取得日数の平均を並べる
export default function SummaryStats({ summary }: Props) {
  const { count, trend, mode, salary, averages } = summary
  return (
    <div className="space-y-4">
      <section>
        <h2 className="text-sm font-bold text-gray-700">利用件数</h2>
        <p className="text-2xl font-bold">{count}件</p>
        <ul className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-500">
          {trend.points.map((p) => (
            <li key={p.label}>
              {p.label}: {p.count}件
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-bold text-gray-700">モード別</h2>
        <p className="text-sm text-gray-700">
          ママ {mode.mamaCount}件 ({toPercent(mode.mamaRatio)}) / パパ {mode.papaCount}件 ({toPercent(mode.papaRatio)})
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold text-gray-700">月給</h2>
        <p className="text-sm text-gray-700">平均 {avgYen(salary.average)}</p>
        <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
          {salary.buckets.map((b) => (
            <li key={b.label}>
              {b.label}: {b.count}件
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-bold text-gray-700">給付額・取得日数</h2>
        <p className="text-sm text-gray-700">
          平均給付額 {avgYen(averages.totalAmount)} / 平均取得日数 {avgDays(averages.totalLeaveDays)}
        </p>
      </section>
    </div>
  )
}
