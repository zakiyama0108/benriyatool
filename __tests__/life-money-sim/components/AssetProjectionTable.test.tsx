import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import AssetProjectionTable from '../../../app/life-money-sim/components/AssetProjectionTable'
import type { MonthlyProjectionRow, YearlyProjectionRow } from '../../../app/life-money-sim/lib/types'

// テスト用の月次行を組み立てるヘルパー(未指定の項目は「登録なし」の状態にする)
function monthlyRow(partial: Partial<MonthlyProjectionRow> & { yearMonth: string }): MonthlyProjectionRow {
  return {
    selfAge: undefined,
    spouseAge: undefined,
    childrenAges: [],
    eventItems: [],
    bonusAmount: 0,
    recurringLabels: [],
    netSurplus: 0,
    asset: 0,
    ...partial,
  }
}

// テスト用の年次行を組み立てるヘルパー
function yearlyRow(partial: Partial<YearlyProjectionRow> & { year: number }): YearlyProjectionRow {
  return {
    selfAge: undefined,
    spouseAge: undefined,
    childrenAges: [],
    eventItems: [],
    bonusAmount: 0,
    recurringLabels: [],
    yearlySurplus: 0,
    asset: 0,
    ...partial,
  }
}

// 仕様: specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-3、specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-4、specs/life-money-sim/asset-projection/requirements.md#定期的な収入・支出の登録-6
describe('資産推移テーブルのイベント列 - 賞与・イベント・定期項目の名目に金額を添えて表示する(月次表示)', () => {
  it('賞与の登録がある月は、「賞与」の名目とともに金額(万円)が表示されること', () => {
    const rows = [monthlyRow({ yearMonth: '2026-06', bonusAmount: 50 })]
    render(<AssetProjectionTable periodUnit="month" monthlyRows={rows} yearlyRows={[]} />)
    expect(screen.getByText(/賞与\s*50万円/)).toBeTruthy()
  })

  it('イベントの登録がある月は、名目とともに金額(万円)が表示されること', () => {
    const rows = [monthlyRow({ yearMonth: '2026-06', eventItems: [{ label: '結婚', amount: 30 }] })]
    render(<AssetProjectionTable periodUnit="month" monthlyRows={rows} yearlyRows={[]} />)
    expect(screen.getByText(/結婚\s*30万円/)).toBeTruthy()
  })

  it('該当する定期項目がある月は、名目とともに金額(万円)が表示されること(収入・支出それぞれ)', () => {
    const rows = [
      monthlyRow({
        yearMonth: '2026-06',
        recurringLabels: [
          { label: '副業収入', type: 'income', amount: 5 },
          { label: '家賃', type: 'expense', amount: 8 },
        ],
      }),
    ]
    render(<AssetProjectionTable periodUnit="month" monthlyRows={rows} yearlyRows={[]} />)
    expect(screen.getByText(/副業収入\s*5万円/)).toBeTruthy()
    expect(screen.getByText(/家賃\s*8万円/)).toBeTruthy()
  })

  it('賞与・イベント・定期項目のいずれも登録がない月は「—」が表示されること', () => {
    // 年齢欄も未入力だと「—」になり紛らわしいため、年齢は明示的に指定してイベント列だけを見分ける
    const rows = [monthlyRow({ yearMonth: '2026-06', selfAge: 36, spouseAge: 34, childrenAges: [10] })]
    render(<AssetProjectionTable periodUnit="month" monthlyRows={rows} yearlyRows={[]} />)
    expect(screen.getByText('—')).toBeTruthy()
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-3、specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-4、specs/life-money-sim/asset-projection/requirements.md#定期的な収入・支出の登録-6
describe('資産推移テーブルのイベント列 - 賞与・イベント・定期項目の名目に金額を添えて表示する(年次表示)', () => {
  it('その年に該当した賞与・イベント・定期項目それぞれの名目に、金額(万円)が添えて表示されること', () => {
    const rows = [
      yearlyRow({
        year: 2026,
        bonusAmount: 100,
        eventItems: [{ label: '引っ越し', amount: 20 }],
        recurringLabels: [{ label: '家賃', type: 'expense', amount: 96 }],
      }),
    ]
    render(<AssetProjectionTable periodUnit="year" monthlyRows={[]} yearlyRows={rows} />)
    expect(screen.getByText(/賞与\s*100万円/)).toBeTruthy()
    expect(screen.getByText(/引っ越し\s*20万円/)).toBeTruthy()
    expect(screen.getByText(/家賃\s*96万円/)).toBeTruthy()
  })
})
