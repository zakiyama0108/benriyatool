'use client'

import { useState } from 'react'
import type { IncomeInput, PersonalExpenseInput, HouseholdExpenseInput } from './lib/types'
import {
  calcPersonalExpenseMonthly,
  calcHouseholdExpenseTotal,
  calcMonthlySurplus,
  calcAnnualSurplus,
  calcExpenseRatio,
} from './lib/monthlyBalance'
import IncomeForm from './components/IncomeForm'
import ExpenseListInput from './components/ExpenseListInput'
import ExpensePieChart from './components/ExpensePieChart'
import HouseholdShareInput from './components/HouseholdShareInput'
import BalanceSummary from './components/BalanceSummary'

type Tab = 'balance' | 'projection'

// 「収支」「資産推移」の2タブを持つ画面本体。入力状態はここで一括保持し、
// 資産推移タブの計算(asset-projection)へそのまま渡す(仕様: monthly-balance/design.md#状態管理)
export default function Page() {
  const [tab, setTab] = useState<Tab>('balance')

  const [income, setIncome] = useState<IncomeInput>({ monthlySalary: 0, bonusCount: 0, bonusAmountPerTime: 0 })
  const [personalExpense, setPersonalExpense] = useState<PersonalExpenseInput>({ annualItems: [], monthlyItems: [] })
  const [household, setHousehold] = useState<HouseholdExpenseInput>({ hasSpouse: false, items: [], myShare: 0 })

  const personalExpenseMonthly = calcPersonalExpenseMonthly(personalExpense.annualItems, personalExpense.monthlyItems)
  const householdExpenseTotal = calcHouseholdExpenseTotal(household.hasSpouse, household.items)
  const monthlySurplus = calcMonthlySurplus(income.monthlySalary, personalExpenseMonthly, household.hasSpouse, household.myShare)
  const annualSurplus = calcAnnualSurplus(monthlySurplus, income.bonusCount, income.bonusAmountPerTime)
  const expenseRatio = calcExpenseRatio(personalExpenseMonthly, household.hasSpouse, household.myShare, income.monthlySalary)

  const personalExpenseItems = [...personalExpense.annualItems, ...personalExpense.monthlyItems]

  return (
    <div className="min-h-screen bg-[#eaf6f6]">
      <div className="mx-auto max-w-md space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-teal-900">資産推移シミュレーター</h1>
          <p className="mt-1 text-sm text-teal-700/70">毎月の収支から、将来の資産推移を見通す</p>
        </div>

        <div role="tablist" className="flex rounded-full bg-white p-1 shadow-sm">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'balance'}
            onClick={() => setTab('balance')}
            className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
              tab === 'balance' ? 'bg-teal-600 text-white' : 'text-teal-700'
            }`}
          >
            収支
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'projection'}
            onClick={() => setTab('projection')}
            className={`flex-1 rounded-full py-2.5 text-sm font-medium transition-colors ${
              tab === 'projection' ? 'bg-teal-600 text-white' : 'text-teal-700'
            }`}
          >
            資産推移
          </button>
        </div>

        {tab === 'balance' && (
          <div className="space-y-4">
            <IncomeForm income={income} onChange={setIncome} />

            <div className="space-y-3 rounded-[20px] bg-teal-50/70 p-4 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
              <p className="text-sm font-bold text-teal-800">個人支出</p>
              <ExpenseListInput
                label="年額固定費"
                items={personalExpense.annualItems}
                onChange={(annualItems) => setPersonalExpense({ ...personalExpense, annualItems })}
              />
              <ExpenseListInput
                label="月額固定費"
                items={personalExpense.monthlyItems}
                onChange={(monthlyItems) => setPersonalExpense({ ...personalExpense, monthlyItems })}
              />
              <ExpensePieChart items={personalExpenseItems} />
            </div>

            <HouseholdShareInput household={household} onChange={setHousehold} />

            <BalanceSummary
              personalExpenseMonthly={personalExpenseMonthly}
              householdExpenseTotal={householdExpenseTotal}
              hasSpouse={household.hasSpouse}
              expenseRatio={expenseRatio}
              monthlySurplus={monthlySurplus}
              annualSurplus={annualSurplus}
            />
          </div>
        )}

        {tab === 'projection' && (
          <p className="py-8 text-center text-sm text-teal-700/60">資産推移タブは準備中です</p>
        )}
      </div>
    </div>
  )
}
