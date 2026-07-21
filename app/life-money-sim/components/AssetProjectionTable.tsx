'use client'
import type { MonthlyProjectionRow, YearlyProjectionRow, PeriodUnit } from '../lib/types'

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

function AgePill({ age, isFinal }: { age: number | undefined; isFinal: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
        isFinal ? 'bg-white/15 text-white' : 'bg-[#F2FAF9] text-[#7E9491]'
      }`}
    >
      {formatAge(age)}
    </span>
  )
}

// 賞与(ティール文字)とイベント名目(コーラル文字)を並べて表示する。最終行では読みやすさのため白文字にする
function EventCell({ hasBonus, eventLabels, isFinal }: { hasBonus: boolean; eventLabels: string[]; isFinal: boolean }) {
  if (!hasBonus && eventLabels.length === 0) return <span>—</span>
  return (
    <span className="flex flex-wrap items-center gap-1">
      {hasBonus && <span className={`font-bold ${isFinal ? 'text-white' : 'text-[#149E92]'}`}>賞与</span>}
      {eventLabels.length > 0 && (
        <span className={`font-bold ${isFinal ? 'text-white' : 'text-[#FF6F59]'}`}>{eventLabels.join('、')}</span>
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
      <div className="overflow-x-auto rounded-[18px] bg-white p-2 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#C1E1DB] text-left text-[#7E9491]">
              <th className="whitespace-nowrap px-2 py-1.5 font-semibold">年月</th>
              <th className="whitespace-nowrap px-2 py-1.5 font-semibold">本人</th>
              <th className="whitespace-nowrap px-2 py-1.5 font-semibold">配偶者</th>
              <th className="whitespace-nowrap px-2 py-1.5 font-semibold">子ども</th>
              <th className="whitespace-nowrap px-2 py-1.5 font-semibold">イベント</th>
              <th className="whitespace-nowrap px-2 py-1.5 font-semibold">差引後余剰</th>
              <th className="whitespace-nowrap px-2 py-1.5 font-semibold">資産額</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map((row, i) => {
              const isFinal = i === monthlyRows.length - 1
              const isMarked = row.eventLabels.length > 0 || row.hasBonus
              return (
                <tr
                  key={row.yearMonth}
                  className={
                    isFinal
                      ? 'bg-[#149E92] font-bold text-white'
                      : isMarked
                        ? 'bg-[#FDECC9] border-b border-[#DCEFEC]'
                        : 'border-b border-[#DCEFEC]'
                  }
                >
                  <td className="whitespace-nowrap px-2 py-1.5">{row.yearMonth}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <AgePill age={row.selfAge} isFinal={isFinal} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <AgePill age={row.spouseAge} isFinal={isFinal} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-1.5">{row.childrenAges.map(formatAge).join(' / ') || '—'}</td>
                  <td className="whitespace-nowrap px-2 py-1.5">
                    <EventCell hasBonus={row.hasBonus} eventLabels={row.eventLabels} isFinal={isFinal} />
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
    <div className="overflow-x-auto rounded-[18px] bg-white p-2 shadow-[0_10px_24px_-16px_rgba(20,158,146,0.35)]">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-[#C1E1DB] text-left text-[#7E9491]">
            <th className="whitespace-nowrap px-2 py-1.5 font-semibold">年</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-semibold">本人</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-semibold">配偶者</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-semibold">子ども</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-semibold">イベント</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-semibold">年次余剰資金</th>
            <th className="whitespace-nowrap px-2 py-1.5 font-semibold">資産額</th>
          </tr>
        </thead>
        <tbody>
          {yearlyRows.map((row, i) => {
            const isFinal = i === yearlyRows.length - 1
            const isMarked = row.eventLabels.length > 0 || row.hasBonus
            return (
              <tr
                key={row.year}
                className={
                  isFinal
                    ? 'bg-[#149E92] font-bold text-white'
                    : isMarked
                      ? 'bg-[#FDECC9] border-b border-[#DCEFEC]'
                      : 'border-b border-[#DCEFEC]'
                }
              >
                <td className="whitespace-nowrap px-2 py-1.5">{row.year}年</td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  <AgePill age={row.selfAge} isFinal={isFinal} />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  <AgePill age={row.spouseAge} isFinal={isFinal} />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">{row.childrenAges.map(formatAge).join(' / ') || '—'}</td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  <EventCell hasBonus={row.hasBonus} eventLabels={row.eventLabels} isFinal={isFinal} />
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
