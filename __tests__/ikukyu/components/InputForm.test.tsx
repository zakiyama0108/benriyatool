import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import InputForm from '../../../app/ikukyu/components/InputForm'

// 仕様: specs/ikukyu/simulator/design.md#型定義（主要）（CalculatorInput）、specs/ikukyu/papa-birth-date/design.md#InputForm（パパモード）
describe('【入力画面】計算に必要な項目の入力フォーム - 入力内容を送信すると計算処理に渡される', () => {
  it('ママモードで月給・出産予定日・育休終了予定日を入力して送信すると、入力内容がそのまま計算処理に渡されること', () => {
    const onSubmit = vi.fn()
    render(<InputForm mode="mama" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/月給/), { target: { value: '320000' } })
    fireEvent.change(screen.getByLabelText(/出産予定日/), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText(/育休終了予定日/), { target: { value: '2027-10-31' } })
    fireEvent.click(screen.getByRole('button', { name: '計算する' }))

    expect(onSubmit).toHaveBeenCalledWith({
      mode: 'mama',
      monthlySalary: 320000,
      dueDate: '2026-11-01',
      leaveEndDate: '2027-10-31',
    })
  })

  it('パパモードで月給・出産予定日・育休開始日・育休終了予定日を入力して送信すると、入力内容がそのまま計算処理に渡されること', () => {
    const onSubmit = vi.fn()
    render(<InputForm mode="papa" onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText(/月給/), { target: { value: '380000' } })
    fireEvent.change(screen.getByLabelText('出産予定日'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('育休開始日'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText(/育休終了予定日/), { target: { value: '2027-04-29' } })
    fireEvent.click(screen.getByRole('button', { name: '計算する' }))

    expect(onSubmit).toHaveBeenCalledWith({
      mode: 'papa',
      monthlySalary: 380000,
      dueDate: '2026-11-01',
      leaveStartDate: '2026-11-01',
      leaveEndDate: '2027-04-29',
    })
  })

  it('必須項目である月給が未入力のまま送信しても、計算処理が呼ばれないこと', () => {
    const onSubmit = vi.fn()
    render(<InputForm mode="mama" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/出産予定日/), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText(/育休終了予定日/), { target: { value: '2027-10-31' } })
    fireEvent.click(screen.getByRole('button', { name: '計算する' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('必須項目である日付が未入力のまま送信しても、計算処理が呼ばれないこと', () => {
    const onSubmit = vi.fn()
    render(<InputForm mode="mama" onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText(/月給/), { target: { value: '320000' } })
    fireEvent.click(screen.getByRole('button', { name: '計算する' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
