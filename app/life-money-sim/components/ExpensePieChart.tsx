'use client'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { ExpenseItem } from '../lib/types'

type Props = {
  items: ExpenseItem[]
}

// オーシャンミントのトーンの配色トークン(ティール=資産・黒字、コーラル=支出、サンドイエロー=ハイライト)を
// 円グラフの項目色としても使い回す。CSS変数はglobals.cssの@themeで一元管理する
const COLORS = ['var(--color-lms-teal)', 'var(--color-lms-coral)', 'var(--color-lms-sand)', 'var(--color-lms-line-strong)']

// 内訳リストの各項目の金額比率をドーナツ型の円グラフで表示する表示専用コンポーネント
// (仕様: requirements.md#内訳の可視化)
export default function ExpensePieChart({ items }: Props) {
  const data = items
    .filter((item) => Number.isFinite(item.amount) && item.amount > 0)
    .map((item) => ({ name: item.name || '(名称未入力)', value: item.amount }))

  if (data.length === 0) {
    return <p className="py-6 text-center text-xs text-lms-muted">表示できる内訳がありません</p>
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
