import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import PaymentScheduleList from '../../../app/ikukyu/components/PaymentSchedule'
import type { PaymentSchedule } from '../../../app/ikukyu/lib/types'

const schedules: PaymentSchedule[] = [
  {
    startDate: '2026-12-28',
    endDate: '2027-02-27',
    days: 62,
    amount: 443052,
    estimatedPaymentMonth: '2027年4月中旬ごろ',
    benefitType: 'childcare67',
  },
  {
    startDate: '2027-02-28',
    endDate: '2027-04-27',
    days: 59,
    amount: 421474,
    estimatedPaymentMonth: '2027年6月中旬ごろ',
    benefitType: 'childcare67',
    isFinal: true,
  },
]

// 仕様: specs/ikukyu/simulator/requirements.md#依存関係-1
describe('【結果画面】振込スケジュール一覧表示 - 給付金がいつ・いくら振り込まれるかを一覧表示する', () => {
  it('振込予定月と金額を含む振込スケジュールの一覧が画面に表示されること', () => {
    render(<PaymentScheduleList schedules={schedules} />)
    expect(screen.getByText(/2027年4月中旬ごろ/)).toBeDefined()
    expect(screen.getByText(/2027年6月中旬ごろ/)).toBeDefined()
    expect(screen.getByText(/443,052/)).toBeDefined()
    expect(screen.getByText(/421,474/)).toBeDefined()
  })

  it('最後の振込にあたる行には「最終振込」のバッジが表示されること', () => {
    render(<PaymentScheduleList schedules={schedules} />)
    expect(screen.getByText('最終振込')).toBeDefined()
  })
})
