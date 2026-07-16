import type { AdminRecord } from './types'

// 保存日時(ISO8601・UTC)を日本時間の「YYYY/MM/DD HH:mm」で表示する。
// テスト実行環境のタイムゾーンに依存しないよう、UTCに9時間を足して各要素を取り出す
export function formatDateTime(iso: string): string {
  const jst = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(jst.getUTCDate()).padStart(2, '0')
  const hh = String(jst.getUTCHours()).padStart(2, '0')
  const mm = String(jst.getUTCMinutes()).padStart(2, '0')
  return `${y}/${m}/${d} ${hh}:${mm}`
}

// 「YYYY-MM-DD」の日付文字列を「YYYY/MM/DD」で表示する
export function formatDate(date: string): string {
  return date.replace(/-/g, '/')
}

export function formatMode(mode: AdminRecord['mode']): string {
  return mode === 'mama' ? 'ママ' : 'パパ'
}

// 金額を3桁区切り＋「円」で表示する
export function formatYen(amount: number): string {
  return `${amount.toLocaleString('en-US')}円`
}

export function formatDays(days: number): string {
  return `${days}日`
}

// 育休開始日など未設定になりうる日付。未設定は空であることが分かる記号で表示する
export function formatOptionalDate(date: string | null): string {
  return date ? formatDate(date) : '—'
}

export function formatIsTest(isTest: boolean): string {
  return isTest ? 'テスト' : '通常'
}
