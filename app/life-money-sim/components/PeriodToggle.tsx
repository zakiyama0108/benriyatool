'use client'
import type { PeriodUnit } from '../lib/types'

type Props = {
  value: PeriodUnit
  onChange: (value: PeriodUnit) => void
}

// 資産推移テーブル・グラフの月次/年次の表示単位切り替え(仕様: requirements.md#表示単位の切り替え-1)
export default function PeriodToggle({ value, onChange }: Props) {
  return (
    <div role="tablist" className="flex w-fit rounded-full bg-[#E1F2EF] p-1">
      <button
        type="button"
        role="tab"
        aria-selected={value === 'month'}
        onClick={() => onChange('month')}
        className={`rounded-full px-5 py-2 text-xs font-medium transition-colors ${
          value === 'month' ? 'bg-[#149E92] text-white' : 'text-[#7E9491]'
        }`}
      >
        月次
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === 'year'}
        onClick={() => onChange('year')}
        className={`rounded-full px-5 py-2 text-xs font-medium transition-colors ${
          value === 'year' ? 'bg-[#149E92] text-white' : 'text-[#7E9491]'
        }`}
      >
        年次
      </button>
    </div>
  )
}
