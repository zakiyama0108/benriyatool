'use client'
import type { PeriodUnit } from '../lib/types'

type Props = {
  value: PeriodUnit
  onChange: (value: PeriodUnit) => void
}

// 資産推移テーブル・グラフの月次/年次の表示単位切り替え(仕様: requirements.md#表示単位の切り替え-1)
export default function PeriodToggle({ value, onChange }: Props) {
  return (
    <div role="tablist" className="flex rounded-full bg-white p-1 shadow-sm">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'month'}
        onClick={() => onChange('month')}
        className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
          value === 'month' ? 'bg-teal-600 text-white' : 'text-teal-700'
        }`}
      >
        月次
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'year'}
        onClick={() => onChange('year')}
        className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
          value === 'year' ? 'bg-teal-600 text-white' : 'text-teal-700'
        }`}
      >
        年次
      </button>
    </div>
  )
}
