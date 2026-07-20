import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import FilterBar from '../../../../app/life-money-sim/admin/components/FilterBar'
import type { Filter } from '../../../../app/life-money-sim/admin/lib/types'

const baseFilter: Filter = { fromDate: null, toDate: null, includeTest: false }

// 仕様: specs/life-money-sim/admin/requirements.md#絞り込み-1
describe('【管理】絞り込み操作(期間) - 保存日時の期間を指定して一覧・集計を絞り込む', () => {
  it('開始日を入力すると、その日付を含む絞り込み条件が呼び出し元に伝わること', () => {
    const onChange = vi.fn()
    render(<FilterBar filter={baseFilter} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('開始日'), { target: { value: '2026-07-01' } })
    expect(onChange).toHaveBeenCalledWith({ fromDate: '2026-07-01', toDate: null, includeTest: false })
  })

  it('終了日を入力すると、その日付を含む絞り込み条件が呼び出し元に伝わること', () => {
    const onChange = vi.fn()
    render(<FilterBar filter={baseFilter} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('終了日'), { target: { value: '2026-07-31' } })
    expect(onChange).toHaveBeenCalledWith({ fromDate: null, toDate: '2026-07-31', includeTest: false })
  })
})

// 仕様: specs/life-money-sim/admin/requirements.md#絞り込み-2、specs/life-money-sim/admin/requirements.md#テストデータの扱い-2
describe('【管理】絞り込み操作(テストデータ) - テストデータを含めるかを切り替える', () => {
  it('初期表示では、テストデータを含めるスイッチがオフ(除外)であること', () => {
    render(<FilterBar filter={baseFilter} onChange={vi.fn()} />)
    expect(screen.getByLabelText<HTMLInputElement>('テストデータを含める').checked).toBe(false)
  })

  it('テストデータを含めるに切り替えると、その条件が呼び出し元に伝わること', () => {
    const onChange = vi.fn()
    render(<FilterBar filter={baseFilter} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('テストデータを含める'))
    expect(onChange).toHaveBeenCalledWith({ fromDate: null, toDate: null, includeTest: true })
  })
})
