'use client'
import type { StartingAssetInput } from '../lib/types'

type Props = {
  value: StartingAssetInput
  onChange: (value: StartingAssetInput) => void
}

// 開始資産額・開始年月の入力(仕様: requirements.md#前提入力-1、#前提入力-2)
export default function StartingAssetForm({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <label className="block text-xs text-teal-700">
        開始資産額(万円)
        <input
          type="number"
          value={Number.isFinite(value.startingAsset) ? value.startingAsset : ''}
          onChange={(e) => onChange({ ...value, startingAsset: e.target.valueAsNumber })}
          className="mt-1 w-full rounded-full border border-teal-100 bg-white px-4 py-2 text-sm tabular-nums font-bold outline-none focus:border-teal-400"
        />
      </label>
      <label className="block text-xs text-teal-700">
        開始年月
        <input
          type="month"
          value={value.startYearMonth}
          onChange={(e) => onChange({ ...value, startYearMonth: e.target.value })}
          className="mt-1 w-full rounded-full border border-teal-100 bg-white px-4 py-2 text-sm outline-none focus:border-teal-400"
        />
      </label>
    </div>
  )
}
