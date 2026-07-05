import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ModeToggle from '../../../app/ikukyu/components/ModeToggle'

// 仕様: specs/ikukyu/simulator/requirements.md#機能要件-1
describe('【入力画面】ママ・パパ切り替えタブ - タブをクリックすると計算モードが切り替わる', () => {
  it('パパタブをクリックすると、計算モードがパパに切り替わること', () => {
    const onChange = vi.fn()
    render(<ModeToggle mode="mama" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'パパ' }))
    expect(onChange).toHaveBeenCalledWith('papa')
  })

  it('ママタブをクリックすると、計算モードがママに切り替わること', () => {
    const onChange = vi.fn()
    render(<ModeToggle mode="papa" onChange={onChange} />)
    fireEvent.click(screen.getByRole('tab', { name: 'ママ' }))
    expect(onChange).toHaveBeenCalledWith('mama')
  })
})
