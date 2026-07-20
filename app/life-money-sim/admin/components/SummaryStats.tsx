'use client'
import type { Summary } from '../lib/types'
import { formatManYen } from '../lib/format'

type Props = {
  summary: Summary
}

// 比率(0〜1)をパーセント表示にする
function toPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

// 平均値。算出対象なし(null)のときは空であることが分かる記号にする
function avgManYen(v: number | null): string {
  return v === null ? '—' : formatManYen(v)
}

// 集計表示。件数・推移・配偶者割合・運用モード割合・資産額の平均と分布・月次余剰資金の平均を並べる
// (仕様: requirements.md#集計表示-1〜4)
export default function SummaryStats({ summary }: Props) {
  const { count, trend, spouse, mode, asset, averages } = summary
  return (
    <div className="space-y-4 rounded-[20px] bg-white p-4 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
      <section>
        <h2 className="text-sm font-bold text-teal-800">利用件数</h2>
        <p className="text-2xl font-bold tabular-nums text-teal-700">{count}件</p>
        <ul className="mt-1 flex flex-wrap gap-x-4 text-xs text-gray-500">
          {trend.points.map((p) => (
            <li key={p.label}>
              {p.label}: {p.count}件
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-bold text-teal-800">配偶者あり割合</h2>
        <p className="text-sm text-gray-700">
          {spouse.count}件 ({toPercent(spouse.ratio)})
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold text-teal-800">運用モード</h2>
        <p className="text-sm text-gray-700">
          資産運用 {mode.investmentCount}件 ({toPercent(mode.investmentRatio)}) / 貯蓄のみ {mode.savingsCount}件 (
          {toPercent(mode.savingsRatio)})
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold text-teal-800">最終月時点の資産額</h2>
        <p className="text-sm text-gray-700">平均 {avgManYen(asset.average)}</p>
        <ul className="mt-1 space-y-0.5 text-xs text-gray-500">
          {asset.buckets.map((b) => (
            <li key={b.label}>
              {b.label}: {b.count}件
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-sm font-bold text-teal-800">月次余剰資金(賞与抜き)</h2>
        <p className="text-sm text-gray-700">平均 {avgManYen(averages.monthlySurplus)}</p>
      </section>
    </div>
  )
}
