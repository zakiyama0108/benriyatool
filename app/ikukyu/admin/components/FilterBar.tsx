'use client'
import type { Filter } from '../lib/types'

type Props = {
  filter: Filter
  onChange: (filter: Filter) => void
}

// 期間(開始・終了)とテストデータを含めるかの絞り込み操作。変更は都度呼び出し元に伝える
export default function FilterBar({ filter, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-gray-200 p-4">
      <label className="flex flex-col text-xs text-gray-500">
        開始日
        <input
          type="date"
          aria-label="開始日"
          value={filter.fromDate ?? ''}
          onChange={(e) => onChange({ ...filter, fromDate: e.target.value || null })}
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
        />
      </label>
      <label className="flex flex-col text-xs text-gray-500">
        終了日
        <input
          type="date"
          aria-label="終了日"
          value={filter.toDate ?? ''}
          onChange={(e) => onChange({ ...filter, toDate: e.target.value || null })}
          className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
        />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
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
