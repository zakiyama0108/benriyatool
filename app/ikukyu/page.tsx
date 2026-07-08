'use client'

import { useState } from 'react'
import type { CalculatorInput, CalculatorResult } from './lib/types'
import { calcResult } from './lib/calculator'
import ModeToggle from './components/ModeToggle'
import InputForm from './components/InputForm'
import ResultSummary from './components/ResultSummary'
import BenefitCard from './components/BenefitCard'
import PaymentScheduleList from './components/PaymentSchedule'

const NOTICE_MAMA = '出産手当金・育児休業給付金はいずれも非課税です。所得税・住民税はかかりません。産休・育休中は社会保険料も原則免除されるため、表示額がそのまま手取りの目安になります。'
const NOTICE_PAPA = '出生時育児休業給付金・育児休業給付金はいずれも非課税です。所得税・住民税はかかりません。育休中は社会保険料も原則免除されるため、表示額がそのまま手取りの目安になります。'

export default function Page() {
  const [mode, setMode] = useState<'mama' | 'papa'>('mama')
  const [result, setResult] = useState<CalculatorResult | null>(null)

  function handleModeChange(m: 'mama' | 'papa') {
    setMode(m)
    setResult(null)  // モード切替時に結果をリセット
  }

  function handleSubmit(input: CalculatorInput) {
    setResult(calcResult(input))
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 space-y-6">
      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">出産・育休 給付金シミュレーター</h1>
        <p className="mt-1 text-sm text-gray-500">産後から育休まで、もらえるお金が全部わかる</p>
      </div>

      {/* モード切替 */}
      <ModeToggle mode={mode} onChange={handleModeChange} />

      {/* 入力フォーム */}
      <InputForm mode={mode} onSubmit={handleSubmit} />

      {/* 結果エリア（計算後のみ表示） */}
      {result && (
        <>
          <ResultSummary result={result} />

          {/* 給付金カード */}
          <div className="space-y-3">
            {result.benefits.map((benefit, i) => (
              <BenefitCard key={i} benefit={benefit} />
            ))}
          </div>

          {/* 注意書き */}
          <p className="rounded-xl bg-gray-50 p-4 text-xs text-gray-500 leading-relaxed">
            {mode === 'mama' ? NOTICE_MAMA : NOTICE_PAPA}
          </p>

          {/* 振込スケジュール */}
          <PaymentScheduleList schedules={result.paymentSchedules} />
        </>
      )}
    </div>
  )
}
