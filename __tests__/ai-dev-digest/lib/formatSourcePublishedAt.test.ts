import { describe, it, expect } from 'vitest'
import { formatSourcePublishedAt } from '../../../app/ai-dev-digest/lib/formatSourcePublishedAt'

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-11、specs/ai-dev-digest/article-detail/design.md「その日の記事本文を表示する処理」手順2
describe('出典の投稿日時の整形 - ISO 8601形式の日時をJSTの日付表示(時刻は表示しない)に変換する', () => {
  it('UTC日時をJST(UTC+9)の日付に変換して「YYYY年M月D日」形式で返すこと(日付が繰り上がるケース)', () => {
    expect(formatSourcePublishedAt('2026-07-30T20:30:00Z')).toBe('2026年7月31日')
  })

  it('タイムゾーンオフセット付きの日時も正しく解釈すること', () => {
    expect(formatSourcePublishedAt('2026-08-01T09:00:00+09:00')).toBe('2026年8月1日')
  })
})
