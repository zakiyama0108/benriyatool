'use client'
import type { MonthlyProjectionRow, YearlyProjectionRow, PeriodUnit, RecurringLabel, EventItem } from '../lib/types'

type Props = {
  periodUnit: PeriodUnit
  monthlyRows: MonthlyProjectionRow[]
  yearlyRows: YearlyProjectionRow[]
  investmentMode: boolean
}

function formatManYen(amount: number): string {
  return `${Math.round(amount * 10) / 10}万円`
}

// 運用益列の表示。資産運用モードでは金額を、貯蓄のみモード(運用益なし)では控えめな「−」を表示する
// (仕様: requirements.md#月次の資産推移-6、design.md#資産推移テーブルに金額を表示する処理)
function formatGain(gain: number, investmentMode: boolean): string {
  return investmentMode ? formatManYen(gain) : '—'
}

function formatAge(age: number | undefined): string {
  return age === undefined ? '—' : `${age}歳`
}

// 行の背景色。sticky列(先頭列)は横スクロール中も背景が透けないよう、tr側と同じ色をtd側にも明示する
function rowBgClass(isFinal: boolean, isMarked: boolean): string {
  if (isFinal) return 'bg-lms-teal'
  if (isMarked) return 'bg-lms-sand-soft'
  return 'bg-white'
}

function AgePill({ age, isFinal }: { age: number | undefined; isFinal: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
        isFinal ? 'bg-white/15 text-white' : 'bg-lms-canvas text-lms-muted'
      }`}
    >
      {formatAge(age)}
    </span>
  )
}

// 名目の直後に金額(万円)を添えた表示文字列を組み立てる
// (仕様: design.md#資産推移テーブルに金額を表示する処理)
function formatLabelWithAmount(label: string, amount: number): string {
  return `${label} ${formatManYen(amount)}`
}

// 賞与列(収入賞与/イベント賞与)の1セル。金額があればティール文字で万円表示、なければ「—」
// (仕様: requirements.md#賞与・イベントの登録-4、design.md#資産推移テーブルに金額を表示する処理)
function BonusCell({ amount, isFinal }: { amount: number; isFinal: boolean }) {
  if (amount <= 0) return <span>—</span>
  return <span className={`font-bold tabular-nums ${isFinal ? 'text-white' : 'text-lms-teal'}`}>{formatManYen(amount)}</span>
}

// 定期収入の名目+金額(ティール文字)とイベント・定期支出の名目+金額(コーラル文字)を並べて表示する。
// 賞与は別列(BonusCell)で表示するためここには含めない。最終行では読みやすさのため白文字にする
// (仕様: design.md#ビジュアルトーン、design.md#資産推移テーブルに金額を表示する処理)
function EventCell({
  eventItems,
  recurringLabels,
  isFinal,
}: {
  eventItems: EventItem[]
  recurringLabels: RecurringLabel[]
  isFinal: boolean
}) {
  const incomeTexts = recurringLabels.filter((r) => r.type === 'income').map((r) => formatLabelWithAmount(r.label, r.amount))
  const expenseTexts = recurringLabels.filter((r) => r.type === 'expense').map((r) => formatLabelWithAmount(r.label, r.amount))
  const coralTexts = [...eventItems.map((e) => formatLabelWithAmount(e.label, e.amount)), ...expenseTexts]
  if (incomeTexts.length === 0 && coralTexts.length === 0) return <span>—</span>
  return (
    <span className="flex flex-wrap items-center gap-1">
      {incomeTexts.length > 0 && (
        <span className={`font-bold ${isFinal ? 'text-white' : 'text-lms-teal'}`}>{incomeTexts.join('、')}</span>
      )}
      {coralTexts.length > 0 && (
        <span className={`font-bold ${isFinal ? 'text-white' : 'text-lms-coral'}`}>{coralTexts.join('、')}</span>
      )}
    </span>
  )
}

// 月次/年次の年齢・イベント名目・差引後余剰(または年次余剰資金)・資産推移累計額を表形式で表示する。
// イベント・賞与のある行はサンドイエローの行ハイライトで、最終行(表示範囲の終点)はティール地で強調する
// (仕様: requirements.md#月次の資産推移、requirements.md#表示単位の切り替え-2)
export default function AssetProjectionTable({ periodUnit, monthlyRows, yearlyRows, investmentMode }: Props) {
  if (periodUnit === 'month') {
    return (
      <div className="max-h-[520px] overflow-auto rounded-[35px] border border-lms-line-strong bg-lms-card p-2">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-lms-line-strong text-left text-lms-muted">
              <th className="sticky top-0 left-0 z-30 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">年月</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">本人</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">配偶者</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">子ども</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">賞与(収入)</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">賞与(イベント)</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">イベント</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">差引後余剰</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">運用益</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">資産額</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map((row, i) => {
              const isFinal = i === monthlyRows.length - 1
              const isMarked =
                row.eventItems.length > 0 ||
                row.incomeBonusAmount > 0 ||
                row.eventBonusAmount > 0 ||
                row.recurringLabels.length > 0
              return (
                <tr
                  key={row.yearMonth}
                  className={`${rowBgClass(isFinal, isMarked)} ${isFinal ? 'font-bold text-white' : 'border-b border-lms-line'}`}
                >
                  <td className={`sticky left-0 z-10 whitespace-nowrap px-2 py-1.5 ${rowBgClass(isFinal, isMarked)}`}>
                    {row.yearMonth}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <AgePill age={row.selfAge} isFinal={isFinal} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <AgePill age={row.spouseAge} isFinal={isFinal} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">{row.childrenAges.map(formatAge).join(' / ') || '—'}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <BonusCell amount={row.incomeBonusAmount} isFinal={isFinal} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <BonusCell amount={row.eventBonusAmount} isFinal={isFinal} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <EventCell eventItems={row.eventItems} recurringLabels={row.recurringLabels} isFinal={isFinal} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{formatManYen(row.netSurplus)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{formatGain(row.investmentGain, investmentMode)}</td>
                  <td className="whitespace-nowrap px-2 py-1.5 font-bold tabular-nums">{formatManYen(row.asset)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="max-h-[520px] overflow-auto rounded-[35px] border border-lms-line-strong bg-lms-card p-2">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-lms-line-strong text-left text-lms-muted">
            <th className="sticky top-0 left-0 z-30 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">年</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">本人</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">配偶者</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">子ども</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">賞与(収入)</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">賞与(イベント)</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">イベント</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">年次余剰資金</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">運用益</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">資産額</th>
          </tr>
        </thead>
        <tbody>
          {yearlyRows.map((row, i) => {
            const isFinal = i === yearlyRows.length - 1
            const isMarked =
              row.eventItems.length > 0 ||
              row.incomeBonusAmount > 0 ||
              row.eventBonusAmount > 0 ||
              row.recurringLabels.length > 0
            return (
              <tr
                key={row.year}
                className={`${rowBgClass(isFinal, isMarked)} ${isFinal ? 'font-bold text-white' : 'border-b border-lms-line'}`}
              >
                <td className={`sticky left-0 z-10 whitespace-nowrap px-2 py-1.5 ${rowBgClass(isFinal, isMarked)}`}>
                  {row.year}年
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  <AgePill age={row.selfAge} isFinal={isFinal} />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  <AgePill age={row.spouseAge} isFinal={isFinal} />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">{row.childrenAges.map(formatAge).join(' / ') || '—'}</td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  <BonusCell amount={row.incomeBonusAmount} isFinal={isFinal} />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  <BonusCell amount={row.eventBonusAmount} isFinal={isFinal} />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  <EventCell eventItems={row.eventItems} recurringLabels={row.recurringLabels} isFinal={isFinal} />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{formatManYen(row.yearlySurplus)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{formatGain(row.investmentGain, investmentMode)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 font-bold tabular-nums">{formatManYen(row.asset)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
