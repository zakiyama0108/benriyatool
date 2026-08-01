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
  RecurringEntry,
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
import { CONTEXT_HELP_TEXT } from './lib/usageGuideContent'
import HelpIcon from './components/HelpIcon'
import UsageBanner from './components/UsageBanner'
import GlossaryButton from './components/GlossaryButton'
import AccordionSection from './components/AccordionSection'
import SegmentedControl from './components/SegmentedControl'
import HeroCard from './components/HeroCard'
import IncomeForm from './components/IncomeForm'
import ExpenseListInput from './components/ExpenseListInput'
import ExpensePieChart from './components/ExpensePieChart'
import HouseholdShareInput from './components/HouseholdShareInput'
import BalanceSummary from './components/BalanceSummary'
import StartingAssetForm from './components/StartingAssetForm'
import FamilyProfileForm from './components/FamilyProfileForm'
import EventListInput from './components/EventListInput'
import RecurringEntryListInput from './components/RecurringEntryListInput'
import ModeToggle from './components/ModeToggle'
import PeriodToggle from './components/PeriodToggle'
import AssetProjectionTable from './components/AssetProjectionTable'
import AssetProjectionChart from './components/AssetProjectionChart'
import SaveButton from './components/SaveButton'
import LoginStatus from './components/LoginStatus'
import ScenarioPanel from './components/ScenarioPanel'
import ScenarioLoginPrompt from './components/ScenarioLoginPrompt'

// 資産推移タブの開始年月の初期値(今月)。ブラウザ表示時点の年月を初期表示として使うのみで、
// 計算ロジック自体は入力された年月をそのまま使う
function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// 画面本体。PC(lg以上)では左に入力項目のアコーディオン群、右に常時表示のダッシュボード
// (ヒーローカード・グラフ・テーブル・収支サマリー)を並べる2カラム、スマホでは入力→結果の順に
// 1カラムで積み上げる(サマリーファースト・常時ダッシュボード型。仕様: monthly-balance/design.md#画面設計、
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
    displayYears: 30,
  })
  const [bonuses, setBonuses] = useState<BonusEntry[]>([])
  const [events, setEvents] = useState<EventEntry[]>([])
  const [recurringEntries, setRecurringEntries] = useState<RecurringEntry[]>([])
  const [investmentModeInput, setInvestmentModeInput] = useState<InvestmentModeInput>({
    investmentMode: false,
    expectedAnnualRate: 0,
  })
  const [periodUnit, setPeriodUnit] = useState<PeriodUnit>('year')
  const [session, setSession] = useState<Session | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioRecord[]>([])
  const hasAutoLoadedRef = useRef(false)

  // 9枚のカードのうち、どのカードのコンテキストヘルプ(？アイコン)のポップオーバーが
  // 開いているかを画面全体で1つだけ保持する(仕様: usage-guide/design.md#状態管理)
  const [openHelpId, setOpenHelpId] = useState<string | null>(null)
  function toggleHelp(id: string) {
    setOpenHelpId((current) => (current === id ? null : id))
  }
  function closeHelp() {
    setOpenHelpId(null)
  }

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
      startingAssetInput: { startingAsset: 0, startYearMonth: currentYearMonth(), displayYears: 30 },
      bonuses: [],
      events: [],
      recurringEntries: [],
      investmentModeInput: { investmentMode: false, expectedAnnualRate: 0 },
    })
    setIncome(filled.income)
    setPersonalExpense(filled.personalExpense)
    setHousehold(filled.household)
    setFamilyProfile(filled.familyProfile)
    setStartingAssetInput(filled.startingAssetInput)
    setBonuses(filled.bonuses)
    setEvents(filled.events)
    setRecurringEntries(filled.recurringEntries)
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
      recurringEntries,
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
    return ok
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
    return ok
  }

  const personalExpenseMonthly = calcPersonalExpenseMonthly(personalExpense.annualItems, personalExpense.monthlyItems)
  const householdExpenseTotal = calcHouseholdExpenseTotal(household.hasSpouse, household.items)
  const monthlySurplus = calcMonthlySurplus(income.monthlySalary, personalExpenseMonthly, household.hasSpouse, household.myShare)
  const annualSurplus = calcAnnualSurplus(monthlySurplus, income.bonusCount, income.bonusAmountPerTime)
  const expenseRatio = calcExpenseRatio(personalExpenseMonthly, household.hasSpouse, household.myShare, income.monthlySalary)

  const personalExpenseItems = [...personalExpense.annualItems, ...personalExpense.monthlyItems]

  const finalYearMonth = calcFinalYearMonth(startingAssetInput.startYearMonth, startingAssetInput.displayYears)
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
    recurringEntries,
    investmentMode: investmentModeInput.investmentMode,
    expectedAnnualRate: investmentModeInput.expectedAnnualRate,
  })
  const yearlyRows = aggregateYearly(monthlyRows)
  const finalMonthAsset = monthlyRows.length > 0 ? monthlyRows[monthlyRows.length - 1].asset : startingAssetInput.startingAsset

  // ヒーローカードのミニグラフは、選択中の表示単位(月次/年次)と同じ粒度のデータ点を使う
  // (仕様: asset-projection/design.md#表示単位を切り替える処理)
  const heroRows =
    periodUnit === 'month'
      ? monthlyRows.map((r) => ({ label: r.yearMonth, asset: r.asset }))
      : yearlyRows.map((r) => ({ label: `${r.year}年`, asset: r.asset }))
  const modeLabel = investmentModeInput.investmentMode ? '資産運用' : '貯蓄のみ'

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

        <UsageBanner />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
          {/* 入力項目群(アコーディオン)。開閉状態はセクションごとに独立、「？」ヘルプのみ画面全体で1つに絞る */}
          <div className="flex flex-col gap-3">
            <h2 className="px-1 text-sm font-bold text-lms-muted">入力項目</h2>

            <AccordionSection
              title="収入"
              helpId="income"
              helpText={CONTEXT_HELP_TEXT.income}
              openHelpId={openHelpId}
              onToggleHelp={toggleHelp}
              onCloseHelp={closeHelp}
              summary={`手取り${income.monthlySalary}万円/月・賞与 年${income.bonusCount}回`}
              defaultOpen
            >
              <IncomeForm income={income} onChange={setIncome} />
            </AccordionSection>

            <AccordionSection
              title="個人支出"
              helpId="personalExpense"
              helpText={CONTEXT_HELP_TEXT.personalExpense}
              openHelpId={openHelpId}
              onToggleHelp={toggleHelp}
              onCloseHelp={closeHelp}
              summary={`年額 ${personalExpense.annualItems.length}件・月額 ${personalExpense.monthlyItems.length}件`}
            >
              <div className="space-y-4">
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
            </AccordionSection>

            <AccordionSection
              title="家計支出"
              helpId="household"
              helpText={CONTEXT_HELP_TEXT.household}
              openHelpId={openHelpId}
              onToggleHelp={toggleHelp}
              onCloseHelp={closeHelp}
              summary={household.hasSpouse ? `自分負担 ${household.myShare}万円/月` : '配偶者なし'}
            >
              <HouseholdShareInput household={household} onChange={setHousehold} />
            </AccordionSection>

            <AccordionSection
              title="前提入力"
              helpId="startingAsset"
              helpText={CONTEXT_HELP_TEXT.startingAsset}
              openHelpId={openHelpId}
              onToggleHelp={toggleHelp}
              onCloseHelp={closeHelp}
              summary={`開始 ${startingAssetInput.startingAsset}万円・${startingAssetInput.startYearMonth}から${startingAssetInput.displayYears}年`}
            >
              <StartingAssetForm value={startingAssetInput} onChange={setStartingAssetInput} />
            </AccordionSection>

            <AccordionSection
              title="家族構成"
              helpId="familyProfile"
              helpText={CONTEXT_HELP_TEXT.familyProfile}
              openHelpId={openHelpId}
              onToggleHelp={toggleHelp}
              onCloseHelp={closeHelp}
              summary={`本人${familyProfile.selfBirthMonth ?? '未入力'}${household.hasSpouse ? '・配偶者あり' : ''}${
                familyProfile.childrenCount > 0 ? `・子ども${familyProfile.childrenCount}人` : ''
              }`}
            >
              <FamilyProfileForm
                profile={familyProfile}
                onChange={setFamilyProfile}
                hasSpouse={household.hasSpouse}
                onHasSpouseChange={(hasSpouse) => setHousehold({ ...household, hasSpouse })}
              />
            </AccordionSection>

            <AccordionSection
              title="貯蓄/運用切替"
              helpId="investmentMode"
              helpText={CONTEXT_HELP_TEXT.investmentMode}
              openHelpId={openHelpId}
              onToggleHelp={toggleHelp}
              onCloseHelp={closeHelp}
              summary={
                investmentModeInput.investmentMode ? `資産運用(利回り${investmentModeInput.expectedAnnualRate}%)` : '貯蓄のみ'
              }
            >
              <ModeToggle value={investmentModeInput} onChange={setInvestmentModeInput} />
            </AccordionSection>

            <AccordionSection
              title="賞与・イベント"
              helpId="eventBonus"
              helpText={CONTEXT_HELP_TEXT.eventBonus}
              openHelpId={openHelpId}
              onToggleHelp={toggleHelp}
              onCloseHelp={closeHelp}
              summary={`賞与 ${bonuses.length}件・イベント ${events.length}件`}
            >
              <EventListInput bonuses={bonuses} onBonusesChange={setBonuses} events={events} onEventsChange={setEvents} />
            </AccordionSection>

            <AccordionSection title="定期的な収入・支出" summary={`${recurringEntries.length}件`}>
              <RecurringEntryListInput entries={recurringEntries} onChange={setRecurringEntries} />
            </AccordionSection>
          </div>

          {/* 常時表示のダッシュボード(ヒーローカード・グラフ・テーブル・収支サマリー) */}
          <div className="flex flex-col gap-4">
            <HeroCard rows={heroRows} startAsset={startingAssetInput.startingAsset} modeLabel={modeLabel} />

            <div className="flex flex-wrap items-center gap-3">
              <SegmentedControl
                label="貯蓄/運用切替"
                value={investmentModeInput.investmentMode ? 'invest' : 'saving'}
                onChange={(next) => setInvestmentModeInput({ ...investmentModeInput, investmentMode: next === 'invest' })}
                options={[
                  { value: 'saving', label: '貯蓄のみ' },
                  { value: 'invest', label: '資産運用' },
                ]}
              />
              <PeriodToggle value={periodUnit} onChange={setPeriodUnit} />
            </div>

            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-lms-ink">資産推移グラフ・テーブル</p>
              <HelpIcon
                id="assetProjection"
                text={CONTEXT_HELP_TEXT.assetProjection}
                openId={openHelpId}
                onToggle={toggleHelp}
                onClose={closeHelp}
              />
              <GlossaryButton />
            </div>

            <AssetProjectionChart periodUnit={periodUnit} monthlyRows={monthlyRows} yearlyRows={yearlyRows} />

            <AssetProjectionTable periodUnit={periodUnit} monthlyRows={monthlyRows} yearlyRows={yearlyRows} />

            <BalanceSummary
              personalExpenseMonthly={personalExpenseMonthly}
              householdExpenseTotal={householdExpenseTotal}
              hasSpouse={household.hasSpouse}
              expenseRatio={expenseRatio}
              monthlySurplus={monthlySurplus}
              annualSurplus={annualSurplus}
              openHelpId={openHelpId}
              onToggleHelp={toggleHelp}
              onCloseHelp={closeHelp}
            />

            <SaveButton input={saveResultInput} />

            {session ? (
              <ScenarioPanel
                scenarios={scenarios}
                onSave={handleSaveScenario}
                onLoad={handleLoadScenario}
                onDelete={handleDeleteScenario}
              />
            ) : (
              <ScenarioLoginPrompt onLoginClick={() => void signInWithGoogle(window.location.href)} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
