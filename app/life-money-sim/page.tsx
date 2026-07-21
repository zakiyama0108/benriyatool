'use client'

import { useEffect, useRef, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
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
  ScenarioInputState,
  ScenarioRecord,
} from './lib/types'
import {
  calcPersonalExpenseMonthly,
  calcHouseholdExpenseTotal,
  calcMonthlySurplus,
  calcAnnualSurplus,
  calcExpenseRatio,
} from './lib/monthlyBalance'
import { calcFinalYearMonth, buildMonthlyProjectionRows, aggregateYearly } from './lib/assetProjection'
import { getSession, onAuthChange, signInWithGoogle, signOut } from '../lib/adminAuth'
import { fetchScenarios, saveScenario, deleteScenario, fillMissingScenarioFields } from './lib/savedScenario'
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
import LoginStatus from './components/LoginStatus'
import ScenarioPanel from './components/ScenarioPanel'

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
  const [session, setSession] = useState<Session | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioRecord[]>([])
  const hasAutoLoadedRef = useRef(false)

  // ログインセッションの取得・変化の購読(仕様: user-auth/design.md#ログイン状態を判定して表示を出し分ける処理)
  useEffect(() => {
    let active = true
    void getSession().then((s) => {
      if (active) setSession(s)
    })
    const unsubscribe = onAuthChange(() => {
      void getSession().then((s) => {
        if (active) setSession(s)
      })
    })
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  // 保存対象の入力値一式を復元する(仕様: saved-scenario/design.md#読み込む処理、design.md#保存対象の入力値)
  function applyScenario(inputState: ScenarioInputState) {
    const filled = fillMissingScenarioFields(inputState, {
      income: { monthlySalary: 0, bonusCount: 0, bonusAmountPerTime: 0 },
      personalExpense: { annualItems: [], monthlyItems: [] },
      household: { hasSpouse: false, items: [], myShare: 0 },
      familyProfile: { selfBirthMonth: null, spouseBirthMonth: null, childrenCount: 0, childrenBirthMonths: [] },
      startingAssetInput: { startingAsset: 0, startYearMonth: currentYearMonth() },
      bonuses: [],
      events: [],
      investmentModeInput: { investmentMode: false, expectedAnnualRate: 0 },
    })
    setIncome(filled.income)
    setPersonalExpense(filled.personalExpense)
    setHousehold(filled.household)
    setFamilyProfile(filled.familyProfile)
    setStartingAssetInput(filled.startingAssetInput)
    setBonuses(filled.bonuses)
    setEvents(filled.events)
    setInvestmentModeInput(filled.investmentModeInput)
  }

  // ログイン完了で一覧を取得し、初回のみ最も新しいシナリオを自動反映する
  // (仕様: saved-scenario/design.md#ログイン直後に保存済み一覧を取得し自動反映する処理)
  useEffect(() => {
    if (!session) {
      // ログアウト時はScenarioPanel自体を表示しないため一覧のリセットは不要(design.md#マイシナリオ操作の表示を出し分ける処理)
      hasAutoLoadedRef.current = false
      return
    }
    let active = true
    fetchScenarios()
      .then((list) => {
        if (!active) return
        setScenarios(list)
        if (!hasAutoLoadedRef.current && list.length > 0) {
          applyScenario(list[0].inputState)
        }
        hasAutoLoadedRef.current = true
      })
      .catch((e) => {
        // 取得失敗はエラー表示せず一覧なし扱いにする(design.md#エラーハンドリング)
        // eslint-disable-next-line no-console -- 原因究明用。inputStateの中身は出さない
        console.error('マイシナリオ: 一覧取得に失敗しました', e)
      })
    return () => {
      active = false
    }
  }, [session])

  async function handleSaveScenario(name: string) {
    const currentState: ScenarioInputState = {
      income,
      personalExpense,
      household,
      familyProfile,
      startingAssetInput,
      bonuses,
      events,
      investmentModeInput,
    }
    const ok = await saveScenario(name, currentState)
    if (ok) {
      try {
        setScenarios(await fetchScenarios())
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('マイシナリオ: 保存後の一覧再取得に失敗しました', e)
      }
    }
  }

  function handleLoadScenario(id: string) {
    const record = scenarios.find((s) => s.id === id)
    if (record) applyScenario(record.inputState)
  }

  async function handleDeleteScenario(id: string) {
    const ok = await deleteScenario(id)
    if (ok) {
      try {
        setScenarios(await fetchScenarios())
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('マイシナリオ: 削除後の一覧再取得に失敗しました', e)
      }
    }
  }

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
    <div className="min-h-screen bg-lms-canvas">
      <div className="mx-auto max-w-md space-y-6 px-4 py-6 sm:px-8 sm:py-10 lg:max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-lms-ink">資産推移シミュレーター</h1>
            <p className="mt-1 text-sm text-lms-muted">毎月の収支から、将来の資産推移を見通す</p>
          </div>
          <LoginStatus
            session={session}
            onLoginClick={() => void signInWithGoogle(window.location.href)}
            onLogoutClick={() => void signOut()}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr] lg:items-start">
          <div className="space-y-4">
            <IncomeForm income={income} onChange={setIncome} />

            <div className="space-y-3 rounded-[18px] bg-lms-card p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
              <p className="text-sm font-bold text-lms-ink">個人支出</p>
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
            <div className="space-y-3 rounded-[18px] bg-lms-card p-5 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
              <p className="text-sm font-bold text-lms-ink">前提入力</p>
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

            {session && (
              <ScenarioPanel
                scenarios={scenarios}
                onSave={(name) => void handleSaveScenario(name)}
                onLoad={handleLoadScenario}
                onDelete={(id) => void handleDeleteScenario(id)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
