import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ResultsTable from '../../../../app/ikukyu/admin/components/ResultsTable'
import type { AdminRecord } from '../../../../app/ikukyu/admin/lib/types'

function rec(over: Partial<AdminRecord>): AdminRecord {
  return {
    id: 'x',
    created_at: '2026-07-15T02:30:00.000Z',
    mode: 'mama',
    monthly_salary: 300000,
    due_date: '2026-11-01',
    leave_start_date: null,
    leave_end_date: '2027-10-31',
    total_amount: 1234567,
    total_leave_days: 406,
    is_test: false,
    ...over,
  }
}

// 仕様: specs/ikukyu/admin/requirements.md#一覧表示-1、specs/ikukyu/admin/requirements.md#一覧表示-3
describe('【管理】保存データの一覧 - 1件ごとの入力・結果を表で表示する', () => {
  it('レコードの各項目が、読める形に整形されて表示されること', () => {
    render(<ResultsTable records={[rec({ mode: 'mama', monthly_salary: 300000 })]} />)
    const row = screen.getAllByRole('row')[1] // 0行目はヘッダー
    expect(within(row).getByText('ママ')).toBeTruthy()
    expect(within(row).getByText('300,000円')).toBeTruthy()
    expect(within(row).getByText('406日')).toBeTruthy()
  })

  it('育休開始日が未設定のママのレコードは、空であることが分かる表示になること', () => {
    render(<ResultsTable records={[rec({ mode: 'mama', leave_start_date: null })]} />)
    const row = screen.getAllByRole('row')[1]
    expect(within(row).getByText('—')).toBeTruthy()
  })

  it('表示している件数が表示されること', () => {
    render(<ResultsTable records={[rec({ id: 'a' }), rec({ id: 'b' })]} />)
    expect(screen.getByText(/2件/)).toBeTruthy()
  })

  it('対象が0件のとき、データがない旨が表示されること', () => {
    render(<ResultsTable records={[]} />)
    expect(screen.getByText(/0件/)).toBeTruthy()
  })
})
