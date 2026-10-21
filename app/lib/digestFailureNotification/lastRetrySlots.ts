// 研究発見・週刊未来予測の「最後の再実行(本番の36時間後)」の時刻スロット定義
// (仕様: specs/digest-failure-notification/design.md「再実行完了を判定する処理」手順2)。
// 各ワークフローのYAML内cronコメントに明記済みの時刻(UTC)をそのまま転記する
// (.github/workflows/research-digest-weekly.yml・future-digest-weekly.ymlのcronコメント参照)。
export type LastRetrySlot = {
  workflowName: string
  utcDayOfWeek: number // Date.prototype.getUTCDay()と同じ基準(0=日曜 ... 6=土曜)
  utcHour: number
  utcMinute: number
}

export const LAST_RETRY_SLOTS: LastRetrySlot[] = [
  { workflowName: '研究発見 週次記事公開', utcDayOfWeek: 2, utcHour: 4, utcMinute: 43 }, // からだ・くらし編: 火曜04:43 UTC
  { workflowName: '研究発見 週次記事公開', utcDayOfWeek: 0, utcHour: 8, utcMinute: 43 }, // 科学・社会編: 日曜08:43 UTC
  { workflowName: '週刊未来予測 週次記事公開', utcDayOfWeek: 5, utcHour: 4, utcMinute: 43 }, // サイエンス・テクノロジー編: 金曜04:43 UTC
  { workflowName: '週刊未来予測 週次記事公開', utcDayOfWeek: 1, utcHour: 6, utcMinute: 43 }, // くらし・社会編: 月曜06:43 UTC
]

// GitHub Actionsのscheduled workflowは混雑時に起動が遅延することがあるため、cron時刻の
// 厳密一致ではなく許容誤差を設ける(design.md「再実行完了を判定する処理」手順2。
// 12時間ごとのスロット間隔に対して十分小さい値)
const TOLERANCE_MINUTES = 90

const MINUTES_PER_WEEK = 7 * 24 * 60

// 週内の「分」位置を求める(getUTCDay()の基準に合わせる)
function minuteOfWeek(date: Date): number {
  return date.getUTCDay() * 24 * 60 + date.getUTCHours() * 60 + date.getUTCMinutes()
}

// createdAtがスロットの時刻からどれだけ離れているか(分)を、週をまたぐ場合も
// 最短距離になるように計算するヘルパー
function diffMinutesFromSlot(date: Date, slot: LastRetrySlot): number {
  const slotMinute = slot.utcDayOfWeek * 24 * 60 + slot.utcHour * 60 + slot.utcMinute
  const raw = Math.abs(minuteOfWeek(date) - slotMinute)
  return Math.min(raw, MINUTES_PER_WEEK - raw)
}

// createdAt(ISO文字列)が、対象ワークフローの「最後の再実行」のいずれかのスロットと
// 許容誤差±90分の範囲で一致するかを判定する
export function isFinalRetrySlot(workflowName: string, createdAt: string): boolean {
  const date = new Date(createdAt)
  return LAST_RETRY_SLOTS.some(
    (slot) => slot.workflowName === workflowName && diffMinutesFromSlot(date, slot) <= TOLERANCE_MINUTES
  )
}
