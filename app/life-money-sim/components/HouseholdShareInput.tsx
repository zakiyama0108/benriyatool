'use client'
import type { HouseholdExpenseInput } from '../lib/types'
import ExpenseListInput from './ExpenseListInput'
import ExpensePieChart from './ExpensePieChart'

type Props = {
  household: HouseholdExpenseInput
  onChange: (household: HouseholdExpenseInput) => void
}

// 配偶者の有無トグルと、配偶者ありの場合のみ表示する家計支出内訳・自分の家計負担額の入力
// (仕様: requirements.md#家計支出-1、#家計支出-2、#家計支出-3)
export default function HouseholdShareInput({ household, onChange }: Props) {
  return (
    <div className="space-y-3 rounded-[20px] bg-teal-50/70 p-4 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-teal-800">家計支出</p>
        <div role="tablist" className="flex rounded-full bg-white p-1 text-xs">
          <button
            type="button"
            role="tab"
            aria-selected={!household.hasSpouse}
            onClick={() => onChange({ ...household, hasSpouse: false })}
            className={`rounded-full px-3 py-1 ${!household.hasSpouse ? 'bg-teal-600 text-white' : 'text-teal-700'}`}
          >
            配偶者なし
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={household.hasSpouse}
            onClick={() => onChange({ ...household, hasSpouse: true })}
            className={`rounded-full px-3 py-1 ${household.hasSpouse ? 'bg-teal-600 text-white' : 'text-teal-700'}`}
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
          <label className="block text-xs text-teal-700">
            自分の家計負担額(万円/月)
            <input
              type="number"
              value={Number.isFinite(household.myShare) ? household.myShare : ''}
              onChange={(e) => onChange({ ...household, myShare: e.target.valueAsNumber })}
              className="mt-1 w-full rounded-full border border-teal-100 bg-white px-4 py-2 text-sm tabular-nums outline-none focus:border-teal-400"
            />
          </label>
          <ExpensePieChart items={household.items} />
        </div>
      )}
    </div>
  )
}
