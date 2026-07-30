'use client'
import type { MonthlyProjectionRow, YearlyProjectionRow, PeriodUnit, RecurringLabel } from '../lib/types'

type Props = {
  periodUnit: PeriodUnit
  monthlyRows: MonthlyProjectionRow[]
  yearlyRows: YearlyProjectionRow[]
}

function formatManYen(amount: number): string {
  return `${Math.round(amount * 10) / 10}万円`
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

// 賞与・定期収入の名目(ティール文字)とイベント・定期支出の名目(コーラル文字)を並べて表示する。
// 最終行では読みやすさのため白文字にする(仕様: design.md#ビジュアルトーン)
function EventCell({
  hasBonus,
  eventLabels,
  recurringLabels,
  isFinal,
}: {
  hasBonus: boolean
  eventLabels: string[]
  recurringLabels: RecurringLabel[]
  isFinal: boolean
}) {
  const incomeLabels = recurringLabels.filter((r) => r.type === 'income').map((r) => r.label)
  const expenseLabels = recurringLabels.filter((r) => r.type === 'expense').map((r) => r.label)
  const tealLabels = [...(hasBonus ? ['賞与'] : []), ...incomeLabels]
  const coralLabels = [...eventLabels, ...expenseLabels]
  if (tealLabels.length === 0 && coralLabels.length === 0) return <span>—</span>
  return (
    <span className="flex flex-wrap items-center gap-1">
      {tealLabels.length > 0 && (
        <span className={`font-bold ${isFinal ? 'text-white' : 'text-lms-teal'}`}>{tealLabels.join('、')}</span>
      )}
      {coralLabels.length > 0 && (
        <span className={`font-bold ${isFinal ? 'text-white' : 'text-lms-coral'}`}>{coralLabels.join('、')}</span>
      )}
    </span>
  )
}

// 月次/年次の年齢・イベント名目・差引後余剰(または年次余剰資金)・資産推移累計額を表形式で表示する。
// イベント・賞与のある行はサンドイエローの行ハイライトで、最終行(表示範囲の終点)はティール地で強調する
// (仕様: requirements.md#月次の資産推移、requirements.md#表示単位の切り替え-2)
export default function AssetProjectionTable({ periodUnit, monthlyRows, yearlyRows }: Props) {
  if (periodUnit === 'month') {
    return (
      <div className="max-h-[520px] overflow-auto rounded-[18px] bg-white p-2 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-lms-line-strong text-left text-lms-muted">
              <th className="sticky top-0 left-0 z-30 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">年月</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">本人</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">配偶者</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">子ども</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">イベント</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">差引後余剰</th>
              <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">資産額</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map((row, i) => {
              const isFinal = i === monthlyRows.length - 1
              const isMarked = row.eventLabels.length > 0 || row.hasBonus || row.recurringLabels.length > 0
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
                    <EventCell hasBonus={row.hasBonus} eventLabels={row.eventLabels} recurringLabels={row.recurringLabels} isFinal={isFinal} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{formatManYen(row.netSurplus)}</td>
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
    <div className="max-h-[520px] overflow-auto rounded-[18px] bg-white p-2 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-lms-line-strong text-left text-lms-muted">
            <th className="sticky top-0 left-0 z-30 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">年</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">本人</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">配偶者</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">子ども</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">イベント</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">年次余剰資金</th>
            <th className="sticky top-0 z-20 whitespace-nowrap bg-white px-2 py-1.5 font-semibold">資産額</th>
          </tr>
        </thead>
        <tbody>
          {yearlyRows.map((row, i) => {
            const isFinal = i === yearlyRows.length - 1
            const isMarked = row.eventLabels.length > 0 || row.hasBonus || row.recurringLabels.length > 0
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
                  <EventCell hasBonus={row.hasBonus} eventLabels={row.eventLabels} recurringLabels={row.recurringLabels} isFinal={isFinal} />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{formatManYen(row.yearlySurplus)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 font-bold tabular-nums">{formatManYen(row.asset)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
