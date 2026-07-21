'use client'

import { useState } from 'react'
import type {
  IncomeInput,
  PersonalExpenseInput,
  HouseholdExpenseInput,
  FamilyProfileInput,
  StartingAssetInput,
  BonusEntry,
  EventEntry,
  InvestmentModeInput,
  PeriodUnit,
  SaveResultInput,
} from './lib/types'
import {
  calcPersonalExpenseMonthly,
  calcHouseholdExpenseTotal,
  calcMonthlySurplus,
  calcAnnualSurplus,
  calcExpenseRatio,
} from './lib/monthlyBalance'
import { calcFinalYearMonth, buildMonthlyProjectionRows, aggregateYearly } from './lib/assetProjection'
import IncomeForm from './components/IncomeForm'
import ExpenseListInput from './components/ExpenseListInput'
import ExpensePieChart from './components/ExpensePieChart'
import HouseholdShareInput from './components/HouseholdShareInput'
import BalanceSummary from './components/BalanceSummary'
import StartingAssetForm from './components/StartingAssetForm'
import FamilyProfileForm from './components/FamilyProfileForm'
import EventListInput from './components/EventListInput'
import ModeToggle from './components/ModeToggle'
import PeriodToggle from './components/PeriodToggle'
import AssetProjectionTable from './components/AssetProjectionTable'
import AssetProjectionChart from './components/AssetProjectionChart'
import SaveButton from './components/SaveButton'

// 資産推移タブの開始年月の初期値(今月)。ブラウザ表示時点の年月を初期表示として使うのみで、
// 計算ロジック自体は入力された年月をそのまま使う
function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// 画面本体。PC(lg以上)では左に収支・右に資産推移を並べる2カラム、
// スマホでは収支→資産推移の順に1カラムで積み上げる(画面イメージのモックアップレビューで
// 選定した「オーシャンミント」トーン・レイアウト。仕様: monthly-balance/design.md#画面設計、
// asset-projection/design.md#画面設計)。入力状態はここで一括保持する(仕様: monthly-balance/design.md#状態管理)
export default function Page() {
  const [income, setIncome] = useState<IncomeInput>({ monthlySalary: 0, bonusCount: 0, bonusAmountPerTime: 0 })
  const [personalExpense, setPersonalExpense] = useState<PersonalExpenseInput>({ annualItems: [], monthlyItems: [] })
  const [household, setHousehold] = useState<HouseholdExpenseInput>({ hasSpouse: false, items: [], myShare: 0 })

  const [familyProfile, setFamilyProfile] = useState<FamilyProfileInput>({
    selfBirthMonth: null,
    spouseBirthMonth: null,
    childrenCount: 0,
    childrenBirthMonths: [],
  })
  const [startingAssetInput, setStartingAssetInput] = useState<StartingAssetInput>({
    startingAsset: 0,
    startYearMonth: currentYearMonth(),
  })
  const [bonuses, setBonuses] = useState<BonusEntry[]>([])
  const [events, setEvents] = useState<EventEntry[]>([])
  const [investmentModeInput, setInvestmentModeInput] = useState<InvestmentModeInput>({
    investmentMode: false,
    expectedAnnualRate: 0,
  })
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>('month')

  const personalExpenseMonthly = calcPersonalExpenseMonthly(personalExpense.annualItems, personalExpense.monthlyItems)
  const householdExpenseTotal = calcHouseholdExpenseTotal(household.hasSpouse, household.items)
  const monthlySurplus = calcMonthlySurplus(income.monthlySalary, personalExpenseMonthly, household.hasSpouse, household.myShare)
  const annualSurplus = calcAnnualSurplus(monthlySurplus, income.bonusCount, income.bonusAmountPerTime)
  const expenseRatio = calcExpenseRatio(personalExpenseMonthly, household.hasSpouse, household.myShare, income.monthlySalary)

  const personalExpenseItems = [...personalExpense.annualItems, ...personalExpense.monthlyItems]

  const finalYearMonth = calcFinalYearMonth(familyProfile.selfBirthMonth, startingAssetInput.startYearMonth)
  const monthlyRows = buildMonthlyProjectionRows({
    startYearMonth: startingAssetInput.startYearMonth,
    finalYearMonth,
    startingAsset: startingAssetInput.startingAsset,
    monthlySurplus,
    selfBirthMonth: familyProfile.selfBirthMonth,
    spouseBirthMonth: household.hasSpouse ? familyProfile.spouseBirthMonth : null,
    childrenBirthMonths: familyProfile.childrenBirthMonths,
    bonuses,
    events,
    investmentMode: investmentModeInput.investmentMode,
    expectedAnnualRate: investmentModeInput.expectedAnnualRate,
  })
  const yearlyRows = aggregateYearly(monthlyRows)
  const finalMonthAsset = monthlyRows.length > 0 ? monthlyRows[monthlyRows.length - 1].asset : startingAssetInput.startingAsset

  const saveResultInput: SaveResultInput = {
    hasSpouse: household.hasSpouse,
    childrenCount: familyProfile.childrenCount,
    monthlySalary: income.monthlySalary,
    personalExpenseMonthly,
    householdExpenseTotal,
    myHouseholdShare: household.myShare,
    startingAsset: startingAssetInput.startingAsset,
    investmentMode: investmentModeInput.investmentMode,
    expectedAnnualRate: investmentModeInput.expectedAnnualRate,
    eventCount: events.length,
    finalMonthAsset,
    monthlySurplus,
  }

  return (
    <div className="min-h-screen bg-[#F2FAF9]">
      <div className="mx-auto max-w-md space-y-6 px-4 py-6 sm:px-8 sm:py-10 lg:max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1C2A28]">資産推移シミュレーター</h1>
          <p className="mt-1 text-sm text-[#7E9491]">毎月の収支から、将来の資産推移を見通す</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
          <div className="space-y-4">
            <IncomeForm income={income} onChange={setIncome} />

            <div className="space-y-3 rounded-[18px] bg-[#E1F2EF] p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
              <p className="text-sm font-bold text-[#1C2A28]">個人支出</p>
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

          <div className="space-y-4">
            <div className="space-y-3 rounded-[18px] bg-[#E1F2EF] p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
              <p className="text-sm font-bold text-[#1C2A28]">前提入力</p>
              <StartingAssetForm value={startingAssetInput} onChange={setStartingAssetInput} />
            </div>

            <FamilyProfileForm
              profile={familyProfile}
              onChange={setFamilyProfile}
              hasSpouse={household.hasSpouse}
              onHasSpouseChange={(hasSpouse) => setHousehold({ ...household, hasSpouse })}
            />

            <ModeToggle value={investmentModeInput} onChange={setInvestmentModeInput} />

            <EventListInput bonuses={bonuses} onBonusesChange={setBonuses} events={events} onEventsChange={setEvents} />

            <PeriodToggle value={periodUnit} onChange={setPeriodUnit} />

            <AssetProjectionChart periodUnit={periodUnit} monthlyRows={monthlyRows} yearlyRows={yearlyRows} />

            <AssetProjectionTable periodUnit={periodUnit} monthlyRows={monthlyRows} yearlyRows={yearlyRows} />

            <SaveButton input={saveResultInput} />
          </div>
        </div>
      </div>
    </div>
  )
}
