import { describe, it, expect } from 'vitest'
import {
  formatDateTime,
  formatDate,
  formatMode,
  formatYen,
  formatDays,
  formatOptionalDate,
  formatIsTest,
} from '../../../../app/ikukyu/admin/lib/format'

// 仕様: specs/ikukyu/admin/requirements.md#一覧表示-1
describe('【管理】一覧の各列の整形 - 保存レコードを表に表示できる形に整える', () => {
  it('保存日時は、日本時間の年月日と時分で表示されること', () => {
    // 2026-07-15T02:30:00Z は日本時間(UTC+9)で 2026/07/15 11:30
    expect(formatDateTime('2026-07-15T02:30:00.000Z')).toBe('2026/07/15 11:30')
  })

  it('日付(出産予定日など)は、年月日で表示されること', () => {
    expect(formatDate('2026-11-01')).toBe('2026/11/01')
  })

  it('モードは、ママ・パパの日本語で表示されること', () => {
    expect(formatMode('mama')).toBe('ママ')
    expect(formatMode('papa')).toBe('パパ')
  })

  it('金額は、3桁区切りと円で表示されること', () => {
    expect(formatYen(300000)).toBe('300,000円')
    expect(formatYen(1234567)).toBe('1,234,567円')
  })

  it('日数は、単位付きで表示されること', () => {
    expect(formatDays(406)).toBe('406日')
  })

  it('育休開始日が未設定(ママや未入力)のときは、空であることが分かる表示になること', () => {
    expect(formatOptionalDate(null)).toBe('—')
    expect(formatOptionalDate('2026-11-01')).toBe('2026/11/01')
  })

  it('テストデータかどうかは、テスト・通常の区別が分かる表示になること', () => {
    expect(formatIsTest(true)).toBe('テスト')
    expect(formatIsTest(false)).toBe('通常')
  })
})
