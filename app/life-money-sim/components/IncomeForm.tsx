'use client'
import type { IncomeInput } from '../lib/types'

type Props = {
  income: IncomeInput
  onChange: (income: IncomeInput) => void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1) // 1〜12月

// 手取り月給・手取りボーナス(支給月の複数選択・1回あたりの金額)の入力(仕様: requirements.md#収入)
export default function IncomeForm({ income, onChange }: Props) {
  // 支給月トグル: 選択済みなら外し、未選択なら加える。表示・保存が安定するよう昇順で保持する
  function toggleBonusMonth(month: number) {
    const selected = income.bonusMonths.includes(month)
    const next = selected
      ? income.bonusMonths.filter((m) => m !== month)
      : [...income.bonusMonths, month].sort((a, b) => a - b)
    onChange({ ...income, bonusMonths: next })
  }

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
      <fieldset className="block text-xs text-lms-muted">
        <legend className="mb-1">ボーナス支給月(複数選択可)</legend>
        <div className="flex flex-wrap gap-1.5">
          {MONTHS.map((month) => {
            const selected = income.bonusMonths.includes(month)
            return (
              <button
                key={month}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleBonusMonth(month)}
                className={`rounded-full border px-2.5 py-1 text-xs tabular-nums transition-colors ${
                  selected
                    ? 'border-lms-teal bg-lms-teal font-bold text-white'
                    : 'border-lms-line-strong bg-white text-lms-muted hover:bg-lms-sand-soft/40'
                }`}
              >
                {month}月
              </button>
            )
          })}
        </div>
      </fieldset>
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
  )
}
