'use client'
import type { AdminRecord } from '../lib/types'
import {
  formatDateTime,
  formatDate,
  formatMode,
  formatYen,
  formatDays,
  formatOptionalDate,
  formatIsTest,
} from '../lib/format'

type Props = {
  records: AdminRecord[]
}

const COLUMNS = [
  '保存日時',
  'モード',
  '月給',
  '出産予定日',
  '育休開始日',
  '育休終了予定日',
  '合計給付額',
  '合計取得日数',
  'テスト',
]

// 保存レコードの一覧表。表示件数も添える
export default function ResultsTable({ records }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500">{records.length}件</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              {COLUMNS.map((c) => (
                <th key={c} className="whitespace-nowrap px-2 py-1 font-medium">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-gray-100">
                <td className="whitespace-nowrap px-2 py-1">{formatDateTime(r.created_at)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatMode(r.mode)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatYen(r.monthly_salary)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatDate(r.due_date)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatOptionalDate(r.leave_start_date)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatDate(r.leave_end_date)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatYen(r.total_amount)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatDays(r.total_leave_days)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatIsTest(r.is_test)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length === 0 && <p className="py-4 text-center text-sm text-gray-400">該当するデータがありません。</p>}
    </div>
  )
}
