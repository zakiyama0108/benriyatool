import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import SortToggle from '../../../app/research-digest/components/SortToggle'

// 仕様: specs/research-digest/article-detail/requirements.md#並び順の切り替え-7
describe('影響度順・ジャンル順の切り替えボタン', () => {
  it('選択中の並び順のボタンが押された状態として示されること', () => {
    render(<SortToggle order="impact" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: '影響度順' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'ジャンル順' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('「ジャンル順」を押すとジャンル順への切り替えが通知されること', () => {
    const onChange = vi.fn()
    render(<SortToggle order="impact" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'ジャンル順' }))
    expect(onChange).toHaveBeenCalledWith('genre')
  })

  it('「影響度順」を押すと影響度順への切り替えが通知されること', () => {
    const onChange = vi.fn()
    render(<SortToggle order="genre" onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '影響度順' }))
    expect(onChange).toHaveBeenCalledWith('impact')
  })
})
