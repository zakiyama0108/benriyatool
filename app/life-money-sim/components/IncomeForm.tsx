'use client'
import type { IncomeInput } from '../lib/types'

type Props = {
  income: IncomeInput
  onChange: (income: IncomeInput) => void
}

// 手取り月給・手取りボーナス(年間回数・1回あたりの金額)の入力(仕様: requirements.md#収入)
export default function IncomeForm({ income, onChange }: Props) {
  return (
    <div className="space-y-3">
      <label className="block text-xs text-lms-muted">
        手取り月給(万円)
        <input
          type="number"
          value={Number.isFinite(income.monthlySalary) ? income.monthlySalary : ''}
          onChange={(e) => onChange({ ...income, monthlySalary: e.target.valueAsNumber })}
          className="mt-1 w-full rounded-full border border-lms-line-strong bg-white px-4 py-2 text-sm tabular-nums font-bold outline-none focus:border-lms-sand-ink focus:bg-lms-sand-soft/40"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-lms-muted">
          ボーナス回数(年間)
          <input
            type="number"
            value={Number.isFinite(income.bonusCount) ? income.bonusCount : ''}
            onChange={(e) => onChange({ ...income, bonusCount: e.target.valueAsNumber })}
            className="mt-1 w-full rounded-full border border-lms-line-strong bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-lms-sand-ink focus:bg-lms-sand-soft/40"
          />
        </label>
        <label className="block text-xs text-lms-muted">
          1回あたり(万円)
          <input
            type="number"
            value={Number.isFinite(income.bonusAmountPerTime) ? income.bonusAmountPerTime : ''}
            onChange={(e) => onChange({ ...income, bonusAmountPerTime: e.target.valueAsNumber })}
            className="mt-1 w-full rounded-full border border-lms-line-strong bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-lms-sand-ink focus:bg-lms-sand-soft/40"
          />
        </label>
      </div>
    </div>
  )
}
