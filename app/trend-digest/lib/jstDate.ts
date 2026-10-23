// 観測ログの実行日をJSTの日付(YYYY-MM-DD)で求める(仕様: trend-history/design.md「履歴データの形式」
// 「<date>は実行日。記事ファイルと同じ命名規則」)。記事ファイル名はワークフローが`TZ=Asia/Tokyo date`で
// 算出するため、観測ログも同じJST日付に揃えないとファイル名が食い違いコミットに失敗する
// (週次cronはUTC 16:43=JST翌01:43起動のため、UTCの日付だと1日前になる)。
// ホストのタイムゾーンに依存しないよう、UTCのミリ秒に+9時間を足してUTC系の値から日付を取り出す
const JST_OFFSET_MS = 9 * 60 * 60 * 1000

export function toJstDateString(now: Date): string {
  return new Date(now.getTime() + JST_OFFSET_MS).toISOString().slice(0, 10)
}
