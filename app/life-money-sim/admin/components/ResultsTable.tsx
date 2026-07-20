'use client'
import type { AdminRecord } from '../lib/types'
import {
  formatDateTime,
  formatHasSpouse,
  formatChildrenCount,
  formatManYen,
  formatInvestmentMode,
  formatOptionalRate,
  formatIsTest,
} from '../lib/format'

type Props = {
  records: AdminRecord[]
}

const COLUMNS = [
  '保存日時',
  '配偶者',
  '子どもの人数',
  '開始資産額',
  '運用モード',
  '想定利回り',
  '最終月時点の資産額',
  '月次余剰資金',
  'テスト',
]

// 保存レコードの一覧表。表示件数も添える(仕様: requirements.md#一覧表示-1、requirements.md#一覧表示-3)
export default function ResultsTable({ records }: Props) {
  return (
    <div className="space-y-2 rounded-[20px] bg-white p-2 shadow-[0_10px_30px_-18px_rgba(15,118,110,0.6)]">
      <p className="px-2 pt-2 text-sm text-teal-700/70">{records.length}件</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-teal-100 text-left text-teal-700">
              {COLUMNS.map((c) => (
                <th key={c} className="whitespace-nowrap px-2 py-1 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-teal-50">
                <td className="whitespace-nowrap px-2 py-1">{formatDateTime(r.created_at)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatHasSpouse(r.has_spouse)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatChildrenCount(r.children_count)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatManYen(r.starting_asset)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatInvestmentMode(r.investment_mode)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatOptionalRate(r.expected_annual_rate)}</td>
                <td className="whitespace-nowrap px-2 py-1 font-bold text-teal-700">{formatManYen(r.final_month_asset)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatManYen(r.monthly_surplus)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatIsTest(r.is_test)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length === 0 && <p className="py-4 text-center text-sm text-teal-700/50">該当するデータがありません。</p>}
    </div>
  )
}
