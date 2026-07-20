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

export function formatHasSpouse(hasSpouse: boolean): string {
  return hasSpouse ? 'あり' : 'なし'
}

export function formatChildrenCount(count: number): string {
  return `${count}人`
}

// 3桁区切り+「万円」で表示する(この画面が扱う金額はすべて万円単位)
export function formatManYen(amount: number): string {
  return `${amount.toLocaleString('en-US')}万円`
}

export function formatInvestmentMode(investmentMode: boolean): string {
  return investmentMode ? '資産運用' : '貯蓄のみ'
}

// 貯蓄のみモードで保存され想定利回りが未設定(null)の場合は、空であることが分かる記号で表示する
export function formatOptionalRate(rate: number | null): string {
  return rate === null ? '—' : `${rate}%`
}

export function formatIsTest(isTest: boolean): string {
  return isTest ? 'テスト' : '通常'
}
