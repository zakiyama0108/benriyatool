'use client'
import type { IncomeInput } from '../lib/types'

type Props = {
  income: IncomeInput
  onChange: (income: IncomeInput) => void
}

// 手取り月給・手取りボーナス(年間回数・1回あたりの金額)の入力(仕様: requirements.md#収入)
export default function IncomeForm({ income, onChange }: Props) {
  return (
    <div className="space-y-3 rounded-[20px] bg-teal-50/70 p-4 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
      <p className="text-sm font-bold text-teal-800">収入</p>
      <label className="block text-xs text-teal-700">
        手取り月給(万円)
        <input
          type="number"
          value={Number.isFinite(income.monthlySalary) ? income.monthlySalary : ''}
          onChange={(e) => onChange({ ...income, monthlySalary: e.target.valueAsNumber })}
          className="mt-1 w-full rounded-full border border-teal-100 bg-white px-4 py-2 text-sm tabular-nums font-bold outline-none focus:border-teal-400"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-teal-700">
          ボーナス回数(年間)
          <input
            type="number"
            value={Number.isFinite(income.bonusCount) ? income.bonusCount : ''}
            onChange={(e) => onChange({ ...income, bonusCount: e.target.valueAsNumber })}
            className="mt-1 w-full rounded-full border border-teal-100 bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-teal-400"
          />
        </label>
        <label className="block text-xs text-teal-700">
          1回あたり(万円)
          <input
            type="number"
            value={Number.isFinite(income.bonusAmountPerTime) ? income.bonusAmountPerTime : ''}
            onChange={(e) => onChange({ ...income, bonusAmountPerTime: e.target.valueAsNumber })}
            className="mt-1 w-full rounded-full border border-amber-200 bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-amber-400"
          />
        </label>
      </div>
    </div>
  )
}
