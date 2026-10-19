import type { Edition } from './types'

// 配信日を求める処理・手動入力の検証(仕様: weekly-publish/requirements.md#利用上限への到達時の再実行-2・5、
// weekly-publish/design.md「配信日を求める処理」「セキュリティ」)。
//
// 再実行が翌日にまたがっても記事の`date`は実行日ではなく「本来の配信日(対象編の配信曜日)」を使うため、
// 実行日時(UTC)から直近の対象編の配信曜日(JST)を求める純粋関数を用意する。本番cron・3本の再実行cron・
// 手動workflow_dispatchのすべてがこの関数を通す

const MS_PER_HOUR = 60 * 60 * 1000
const MS_PER_DAY = 24 * MS_PER_HOUR
const JST_OFFSET_MS = 9 * MS_PER_HOUR

// 編ごとの配信曜日(Date#getUTCDay()の値。0=日曜〜6=土曜。weekly-publish/design.md「実行環境の前提」)。
// サイエンス・テクノロジー編は木曜、くらし・社会編は日曜
const EDITION_WEEKDAY: Record<Edition, number> = {
  'science-tech': 4, // 木曜
  'life-society': 0, // 日曜
}

function toYyyyMmDd(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// 実行日時(UTC)と対象編を受け取り、関数の内側でJSTに変換したうえで、その時点と同じかそれより前で
// 直近の対象編の配信曜日(JST)の日付(YYYY-MM-DD)を返す。ホストのタイムゾーンに依存しないよう、
// UTCのミリ秒にJSTとの差分(+9時間)を足したうえでUTC系のgetterで日付・曜日を取り出す
export function getScheduledPublishDate(nowUtc: Date, edition: Edition): string {
  const jst = new Date(nowUtc.getTime() + JST_OFFSET_MS)
  const dayOfWeek = jst.getUTCDay()
  const targetWeekday = EDITION_WEEKDAY[edition]
  const daysSinceTarget = (dayOfWeek - targetWeekday + 7) % 7
  const scheduled = new Date(jst.getTime() - daysSinceTarget * MS_PER_DAY)
  return toYyyyMmDd(scheduled.getUTCFullYear(), scheduled.getUTCMonth() + 1, scheduled.getUTCDate())
}

// workflow_dispatchの入力scheduled_publish_dateを検証する(design.md「セキュリティ」)。
// シェルインジェクション対策として`run:`に直接埋め込まずenv:経由で渡した値をここで検証する
export function validateScheduledPublishDate(value: string, edition: Edition): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  // 実在する日付かどうか(例: 2026-02-30のような値をDate.UTCが繰り上げてしまうのを検知する)
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return false
  }

  return date.getUTCDay() === EDITION_WEEKDAY[edition]
}
