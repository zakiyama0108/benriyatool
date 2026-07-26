'use client'
import type { HouseholdExpenseInput } from '../lib/types'
import ExpenseListInput from './ExpenseListInput'
import ExpensePieChart from './ExpensePieChart'
import HelpIcon from './HelpIcon'
import { CONTEXT_HELP_TEXT } from '../lib/usageGuideContent'

type Props = {
  household: HouseholdExpenseInput
  onChange: (household: HouseholdExpenseInput) => void
  openHelpId: string | null
  onToggleHelp: (id: string) => void
  onCloseHelp: () => void
}

// 配偶者の有無トグルと、配偶者ありの場合のみ表示する家計支出内訳・自分の家計負担額の入力
// (仕様: requirements.md#家計支出-1、#家計支出-2、#家計支出-3)
export default function HouseholdShareInput({ household, onChange, openHelpId, onToggleHelp, onCloseHelp }: Props) {
  return (
    <div className="space-y-3 rounded-[18px] bg-lms-card p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-bold text-lms-ink">家計支出</p>
          <HelpIcon
            id="household"
            text={CONTEXT_HELP_TEXT.household}
            openId={openHelpId}
            onToggle={onToggleHelp}
            onClose={onCloseHelp}
          />
        </div>
        <div role="tablist" className="flex rounded-full bg-white p-1 text-xs">
          <button
            type="button"
            role="tab"
            aria-selected={!household.hasSpouse}
            onClick={() => onChange({ ...household, hasSpouse: false })}
            className={`rounded-full px-3 py-1 ${!household.hasSpouse ? 'bg-lms-teal text-white' : 'text-lms-muted'}`}
          >
            配偶者なし
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={household.hasSpouse}
            onClick={() => onChange({ ...household, hasSpouse: true })}
            className={`rounded-full px-3 py-1 ${household.hasSpouse ? 'bg-lms-teal text-white' : 'text-lms-muted'}`}
          >
            配偶者あり
          </button>
        </div>
      </div>

      {household.hasSpouse && (
        <div className="space-y-3">
          <ExpenseListInput
            label="家計支出項目"
            items={household.items}
            onChange={(items) => onChange({ ...household, items })}
          />
          <label className="block text-xs text-lms-muted">
            自分の家計負担額(万円/月)
            <input
              type="number"
              value={Number.isFinite(household.myShare) ? household.myShare : ''}
              onChange={(e) => onChange({ ...household, myShare: e.target.valueAsNumber })}
              className="mt-1 w-full rounded-full border border-lms-line bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-lms-teal"
            />
          </label>
          <ExpensePieChart items={household.items} />
        </div>
      )}
    </div>
  )
}
