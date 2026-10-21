// 通知対象と判定された失敗イベントから、LINE通知の本文を組み立てる純粋関数
// (仕様: specs/digest-failure-notification/requirements.md#失敗検知・通知-4、
// design.md「通知メッセージを組み立てて送信する処理」)。
import { WORKFLOW_APP_NAMES } from './workflowAppNames'

export type BuildNotificationMessageInput = {
  workflowName: string
  updatedAt: string // ISO 8601文字列(github.event.workflow_run.updated_at、UTC)
  htmlUrl: string // github.event.workflow_run.html_url
}

// updatedAt(UTC)をJST(UTC+9時間)の"YYYY-MM-DD HH:mm"形式に変換する
function formatAsJst(updatedAt: string): string {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000
  const jst = new Date(new Date(updatedAt).getTime() + JST_OFFSET_MS)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())} ${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}`
}

export function buildNotificationMessage(input: BuildNotificationMessageInput): string {
  const appName = WORKFLOW_APP_NAMES[input.workflowName] ?? input.workflowName
  const failedAtJst = formatAsJst(input.updatedAt)

  return [
    `[${appName}] 記事生成ワークフローが失敗しました`,
    `ワークフロー: ${input.workflowName}`,
    `失敗日時(JST): ${failedAtJst}`,
    `ログ: ${input.htmlUrl}`,
  ].join('\n')
}
