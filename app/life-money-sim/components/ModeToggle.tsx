'use client'
import type { InvestmentModeInput } from '../lib/types'

type Props = {
  value: InvestmentModeInput
  onChange: (value: InvestmentModeInput) => void
}

// 「貯蓄のみ」/「資産運用」の切り替えと、資産運用選択時のみ表示する想定利回り入力
// (仕様: requirements.md#貯蓄/運用シミュレーションの切り替え-1、#貯蓄/運用シミュレーションの切り替え-2、
// #貯蓄/運用シミュレーションの切り替え-3)
export default function ModeToggle({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <div role="tablist" className="flex rounded-full bg-[#E1F2EF] p-1">
        <button
          type="button"
          role="tab"
          aria-selected={!value.investmentMode}
          onClick={() => onChange({ ...value, investmentMode: false })}
          className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
            !value.investmentMode ? 'bg-[#149E92] text-white' : 'text-[#7E9491]'
          }`}
        >
          貯蓄のみ
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={value.investmentMode}
          onClick={() => onChange({ ...value, investmentMode: true })}
          className={`flex-1 rounded-full py-2 text-xs font-medium transition-colors ${
            value.investmentMode ? 'bg-[#149E92] text-white' : 'text-[#7E9491]'
          }`}
        >
          資産運用
        </button>
      </div>
      {value.investmentMode && (
        <label className="block text-xs text-[#7E9491]">
          想定利回り(年率・%)
          <input
            type="number"
            value={Number.isFinite(value.expectedAnnualRate) ? value.expectedAnnualRate : ''}
            onChange={(e) => onChange({ ...value, expectedAnnualRate: e.target.valueAsNumber })}
            className="mt-1 w-full rounded-full border border-[#DCEFEC] bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-[#149E92]"
          />
        </label>
      )}
    </div>
  )
}
