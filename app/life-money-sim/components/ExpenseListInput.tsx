'use client'
import type { ExpenseItem } from '../lib/types'

type Props = {
  items: ExpenseItem[]
  onChange: (items: ExpenseItem[]) => void
  label: string
}

// 名称+金額ペアのリストを追加・削除しながら編集する共通コンポーネント。
// 年額固定費/月額固定費/家計支出項目で共通利用する(仕様: requirements.md#個人支出-1、#個人支出-2)
export default function ExpenseListInput({ items, onChange, label }: Props) {
  function updateItem(index: number, patch: Partial<ExpenseItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function removeItem(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function addItem() {
    onChange([...items, { name: '', amount: 0 }])
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-[#1C2A28]">{label}</p>
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <input
              type="text"
              aria-label={`${label}の名称`}
              value={item.name}
              onChange={(e) => updateItem(index, { name: e.target.value })}
              placeholder="名称"
              className="min-w-0 flex-1 rounded-full border border-[#DCEFEC] bg-white px-4 py-2 text-sm outline-none focus:border-[#149E92]"
            />
            <input
              type="number"
              aria-label={`${label}の金額`}
              value={Number.isFinite(item.amount) ? item.amount : ''}
              onChange={(e) => updateItem(index, { amount: e.target.valueAsNumber })}
              placeholder="万円"
              className="w-24 rounded-full border border-[#DCEFEC] bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-[#149E92]"
            />
            <button
              type="button"
              aria-label={`${label}の項目を削除`}
              onClick={() => removeItem(index)}
              className="shrink-0 rounded-full px-2 py-1 text-xs text-[#FF6F59] hover:bg-[#FFE4DD]"
            >
              削除
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={addItem}
        className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-[#149E92] hover:bg-[#DAF3EF]"
      >
        + 項目を追加
      </button>
    </div>
  )
}
