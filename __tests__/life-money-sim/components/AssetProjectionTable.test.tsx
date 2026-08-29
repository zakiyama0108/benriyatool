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
    incomeBonusAmount: 0,
    eventBonusAmount: 0,
    recurringLabels: [],
    netSurplus: 0,
    investmentGain: 0,
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
    incomeBonusAmount: 0,
    eventBonusAmount: 0,
    recurringLabels: [],
    yearlySurplus: 0,
    investmentGain: 0,
    asset: 0,
    ...partial,
  }
}

// 仕様: specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-3、specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-4、specs/life-money-sim/asset-projection/requirements.md#定期的な収入・支出の登録-6
describe('資産推移テーブルの賞与列・イベント列 - 賞与を収入/イベントの別列で、名目に金額を添えて表示する(月次表示)', () => {
  it('収入賞与がある月は「賞与(収入)」列に、イベント賞与がある月は「賞与(イベント)」列に、それぞれ金額(万円)が表示されること', () => {
    const rows = [monthlyRow({ yearMonth: '2026-06', incomeBonusAmount: 150, eventBonusAmount: 20 })]
    render(<AssetProjectionTable periodUnit="month" monthlyRows={rows} yearlyRows={[]} investmentMode={false} />)
    // 収入賞与とイベント賞与が別々の金額として(合算されず)表示される
    expect(screen.getByText('150万円')).toBeTruthy()
    expect(screen.getByText('20万円')).toBeTruthy()
  })

  it('イベントの登録がある月は、名目とともに金額(万円)が表示されること', () => {
    const rows = [monthlyRow({ yearMonth: '2026-06', eventItems: [{ label: '結婚', amount: 30 }] })]
    render(<AssetProjectionTable periodUnit="month" monthlyRows={rows} yearlyRows={[]} investmentMode={false} />)
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
    render(<AssetProjectionTable periodUnit="month" monthlyRows={rows} yearlyRows={[]} investmentMode={false} />)
    expect(screen.getByText(/副業収入\s*5万円/)).toBeTruthy()
    expect(screen.getByText(/家賃\s*8万円/)).toBeTruthy()
  })

  it('賞与(収入)・賞与(イベント)・イベントのいずれも登録がない月は、その3列が「—」表記になること', () => {
    // 年齢は明示し、資産運用モード(運用益列に金額が入る)でレンダリングして、
    // 賞与(収入)・賞与(イベント)・イベントの3列が「—」になることを確認する
    const rows = [monthlyRow({ yearMonth: '2026-06', selfAge: 36, spouseAge: 34, childrenAges: [10] })]
    render(<AssetProjectionTable periodUnit="month" monthlyRows={rows} yearlyRows={[]} investmentMode={true} />)
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#月次の資産推移-6
describe('資産推移テーブルの運用益列', () => {
  it('資産運用モードでは、各行の運用益(万円)が表示されること', () => {
    const rows = [monthlyRow({ yearMonth: '2026-06', selfAge: 36, investmentGain: 1.5 })]
    render(<AssetProjectionTable periodUnit="month" monthlyRows={rows} yearlyRows={[]} investmentMode={true} />)
    expect(screen.getByText('1.5万円')).toBeTruthy()
  })

  it('貯蓄のみモードでは、運用益列は「—」表記になること', () => {
    // 運用益列の「—」を一意にするため、年齢・賞与・イベントを埋めて他列の「—」を出さない
    const rows = [
      monthlyRow({
        yearMonth: '2026-06',
        selfAge: 36,
        spouseAge: 34,
        childrenAges: [10],
        incomeBonusAmount: 50,
        eventBonusAmount: 20,
        eventItems: [{ label: '結婚', amount: 30 }],
        investmentGain: 0,
      }),
    ]
    render(<AssetProjectionTable periodUnit="month" monthlyRows={rows} yearlyRows={[]} investmentMode={false} />)
    expect(screen.getByText('—')).toBeTruthy()
  })

  it('年次表示でも、資産運用モードでその年の運用益合計が表示されること', () => {
    const rows = [yearlyRow({ year: 2026, selfAge: 36, investmentGain: 12.3 })]
    render(<AssetProjectionTable periodUnit="year" monthlyRows={[]} yearlyRows={rows} investmentMode={true} />)
    expect(screen.getByText('12.3万円')).toBeTruthy()
  })
})

// 仕様: specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-3、specs/life-money-sim/asset-projection/requirements.md#賞与・イベントの登録-4、specs/life-money-sim/asset-projection/requirements.md#定期的な収入・支出の登録-6
describe('資産推移テーブルの賞与列・イベント列 - 賞与を収入/イベントの別列で、名目に金額を添えて表示する(年次表示)', () => {
  it('その年の収入賞与・イベント賞与はそれぞれの列に金額(万円)で、イベント・定期項目は名目に金額を添えて表示されること', () => {
    const rows = [
      yearlyRow({
        year: 2026,
        incomeBonusAmount: 100,
        eventBonusAmount: 40,
        eventItems: [{ label: '引っ越し', amount: 20 }],
        recurringLabels: [{ label: '家賃', type: 'expense', amount: 96 }],
      }),
    ]
    render(<AssetProjectionTable periodUnit="year" monthlyRows={[]} yearlyRows={rows} investmentMode={false} />)
    expect(screen.getByText('100万円')).toBeTruthy()
    expect(screen.getByText('40万円')).toBeTruthy()
    expect(screen.getByText(/引っ越し\s*20万円/)).toBeTruthy()
    expect(screen.getByText(/家賃\s*96万円/)).toBeTruthy()
  })
})
