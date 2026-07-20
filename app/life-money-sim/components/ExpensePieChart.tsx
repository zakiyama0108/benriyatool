'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ExpenseItem } from '../lib/types'

type Props = {
  items: ExpenseItem[]
}

// オーシャンミントのトーンに合わせたドーナツグラフの配色(ティール系を基調に濃淡で項目を分ける)
const COLORS = ['#0f766e', '#14b8a6', '#5eead4', '#f9c74f', '#fb7185', '#94a3b8']

// 内訳リストの各項目の金額比率をドーナツ型の円グラフで表示する表示専用コンポーネント
// (仕様: requirements.md#内訳の可視化)
export default function ExpensePieChart({ items }: Props) {
  const data = items
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0)
    .map((item) => ({ name: item.name || '(名称未入力)', value: item.amount }))

  if (data.length === 0) {
    return <p className="py-6 text-center text-xs text-teal-700/60">表示できる内訳がありません</p>
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${String(value)}万円`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
