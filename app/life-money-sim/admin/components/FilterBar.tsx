'use client'
import type { Filter } from '../lib/types'

type Props = {
  filter: Filter
  onChange: (filter: Filter) => void
}

// 期間(開始・終了)とテストデータを含めるかの絞り込み操作。変更は都度呼び出し元に伝える
// (仕様: requirements.md#絞り込み-1、requirements.md#絞り込み-2)
export default function FilterBar({ filter, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-[20px] bg-teal-50/70 p-4 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
      <label className="flex flex-col text-xs text-teal-700">
        開始日
        <input
          type="date"
          aria-label="開始日"
          value={filter.fromDate ?? ''}
          onChange={(e) => onChange({ ...filter, fromDate: e.target.value || null })}
          className="mt-1 rounded-full border border-teal-100 bg-white px-3 py-1.5 text-sm text-gray-900"
        />
      </label>
      <label className="flex flex-col text-xs text-teal-700">
        終了日
        <input
          type="date"
          aria-label="終了日"
          value={filter.toDate ?? ''}
          onChange={(e) => onChange({ ...filter, toDate: e.target.value || null })}
          className="mt-1 rounded-full border border-teal-100 bg-white px-3 py-1.5 text-sm text-gray-900"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-teal-800">
        <input
          type="checkbox"
          aria-label="テストデータを含める"
          checked={filter.includeTest}
          onChange={(e) => onChange({ ...filter, includeTest: e.target.checked })}
        />
        テストデータを含める
      </label>
    </div>
  )
}
