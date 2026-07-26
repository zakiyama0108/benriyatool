'use client'
import type { IncomeInput } from '../lib/types'
import HelpIcon from './HelpIcon'
import { CONTEXT_HELP_TEXT } from '../lib/usageGuideContent'

type Props = {
  income: IncomeInput
  onChange: (income: IncomeInput) => void
  openHelpId: string | null
  onToggleHelp: (id: string) => void
  onCloseHelp: () => void
}

// 手取り月給・手取りボーナス(年間回数・1回あたりの金額)の入力(仕様: requirements.md#収入)
export default function IncomeForm({ income, onChange, openHelpId, onToggleHelp, onCloseHelp }: Props) {
  return (
    <div className="space-y-3 rounded-[18px] bg-lms-card p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-bold text-lms-ink">収入</p>
        <HelpIcon
          id="income"
          text={CONTEXT_HELP_TEXT.income}
          openId={openHelpId}
          onToggle={onToggleHelp}
          onClose={onCloseHelp}
        />
      </div>
      <label className="block text-xs text-lms-muted">
        手取り月給(万円)
        <input
          type="number"
          value={Number.isFinite(income.monthlySalary) ? income.monthlySalary : ''}
          onChange={(e) => onChange({ ...income, monthlySalary: e.target.valueAsNumber })}
          className="mt-1 w-full rounded-full border border-lms-line bg-white px-4 py-2 text-sm tabular-nums font-bold outline-none focus:border-lms-teal"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs text-lms-muted">
          ボーナス回数(年間)
          <input
            type="number"
            value={Number.isFinite(income.bonusCount) ? income.bonusCount : ''}
            onChange={(e) => onChange({ ...income, bonusCount: e.target.valueAsNumber })}
            className="mt-1 w-full rounded-full border border-lms-line bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-lms-teal"
          />
        </label>
        <label className="block text-xs text-lms-muted">
          1回あたり(万円)
          <input
            type="number"
            value={Number.isFinite(income.bonusAmountPerTime) ? income.bonusAmountPerTime : ''}
            onChange={(e) => onChange({ ...income, bonusAmountPerTime: e.target.valueAsNumber })}
            className="mt-1 w-full rounded-full border border-lms-sand/50 bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-lms-sand"
          />
        </label>
      </div>
    </div>
  )
}
