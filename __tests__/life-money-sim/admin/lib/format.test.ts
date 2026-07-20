import { describe, it, expect } from 'vitest'
import {
  formatDateTime,
  formatHasSpouse,
  formatChildrenCount,
  formatManYen,
  formatInvestmentMode,
  formatOptionalRate,
  formatIsTest,
} from '../../../../app/life-money-sim/admin/lib/format'

// 仕様: specs/life-money-sim/admin/requirements.md#一覧表示-1
describe('【管理】一覧の各列の整形 - 保存レコードを表に表示できる形に整える', () => {
  it('保存日時は、日本時間の年月日と時分で表示されること', () => {
    // 2026-07-15T02:30:00Z は日本時間(UTC+9)で 2026/07/15 11:30
    expect(formatDateTime('2026-07-15T02:30:00.000Z')).toBe('2026/07/15 11:30')
  })

  it('配偶者の有無は、あり・なしの日本語で表示されること', () => {
    expect(formatHasSpouse(true)).toBe('あり')
    expect(formatHasSpouse(false)).toBe('なし')
  })

  it('子どもの人数は、単位付きで表示されること', () => {
    expect(formatChildrenCount(2)).toBe('2人')
  })

  it('万円単位の金額は、3桁区切りと万円で表示されること', () => {
    expect(formatManYen(300)).toBe('300万円')
    expect(formatManYen(12345)).toBe('12,345万円')
  })

  it('運用モードは、貯蓄のみ・資産運用の日本語で表示されること', () => {
    expect(formatInvestmentMode(true)).toBe('資産運用')
    expect(formatInvestmentMode(false)).toBe('貯蓄のみ')
  })

  it('貯蓄のみモードで想定利回りが未設定(null)のときは、空であることが分かる表示になること', () => {
    expect(formatOptionalRate(null)).toBe('—')
    expect(formatOptionalRate(3)).toBe('3%')
  })

  it('テストデータかどうかは、テスト・通常の区別が分かる表示になること', () => {
    expect(formatIsTest(true)).toBe('テスト')
    expect(formatIsTest(false)).toBe('通常')
  })
})
