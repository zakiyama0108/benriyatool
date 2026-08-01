'use client'
import type { InvestmentModeInput } from '../lib/types'
import SegmentedControl from './SegmentedControl'

type Props = {
  value: InvestmentModeInput
  onChange: (value: InvestmentModeInput) => void
}

// 「貯蓄のみ」/「資産運用」の切り替えと、資産運用選択時のみ表示する想定利回り入力
// (仕様: requirements.md#貯蓄/運用シミュレーションの切り替え-1、#貯蓄/運用シミュレーションの切り替え-2、
// #貯蓄/運用シミュレーションの切り替え-3)
export default function ModeToggle({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <SegmentedControl
        label="貯蓄/運用切替"
        fullWidth
        variant="onCard"
        value={value.investmentMode ? 'invest' : 'saving'}
        onChange={(next) => onChange({ ...value, investmentMode: next === 'invest' })}
        options={[
          { value: 'saving', label: '貯蓄のみ' },
          { value: 'invest', label: '資産運用' },
        ]}
      />
      {value.investmentMode && (
        <label className="block text-xs text-lms-muted">
          想定利回り(年率・%)
          <input
            type="number"
            value={Number.isFinite(value.expectedAnnualRate) ? value.expectedAnnualRate : ''}
            onChange={(e) => onChange({ ...value, expectedAnnualRate: e.target.valueAsNumber })}
            className="mt-1 w-full rounded-full border border-lms-line-strong bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-lms-teal"
          />
        </label>
      )}
    </div>
  )
}
