// 5アプリの記事生成ワークフローの失敗を監視し、通知対象と判定された場合にLINE Messaging APIの
// pushメッセージ(1:1)で運営者個人に知らせるCLI(仕様: specs/digest-failure-notification/
// requirements.md#失敗検知・通知-3、design.md「通知メッセージを組み立てて送信する処理」)。
//
// 実行方法(.github/workflows/digest-failure-notification.ymlから呼ばれる):
// WORKFLOW_NAME=... CONCLUSION=... EVENT=... CREATED_AT=... UPDATED_AT=... HTML_URL=... \
// LINE_CHANNEL_ACCESS_TOKEN=xxx LINE_ADMIN_USER_ID=yyy npx tsx scripts/digest-failure-notification/notify.ts
import { pathToFileURL } from 'node:url'
import { shouldNotify } from '../../app/lib/digestFailureNotification/shouldNotify'
import { buildNotificationMessage } from '../../app/lib/digestFailureNotification/buildNotificationMessage'

const LINE_PUSH_ENDPOINT = 'https://api.line.me/v2/bot/message/push'

export type NotifyEnv = Partial<{
  WORKFLOW_NAME: string
  CONCLUSION: string
  EVENT: string
  CREATED_AT: string
  UPDATED_AT: string
  HTML_URL: string
  LINE_CHANNEL_ACCESS_TOKEN: string
  LINE_ADMIN_USER_ID: string
}>

// 必須の環境変数を読み取る。未設定の場合は例外を投げる(CLIの早期失敗)
function requireEnv(env: NotifyEnv, key: keyof NotifyEnv): string {
  const value = env[key]
  if (!value) {
    throw new Error(`環境変数 ${key} が設定されていません`)
  }
  return value
}

// workflow_runイベントの情報(環境変数経由)から、通知すべきかどうかを判定し、
// 通知対象の場合のみLINE Messaging APIのpushメッセージを送信する(design.md「通知メッセージを
// 組み立てて送信する処理」)。CLI実行用のmain()から切り出した薄い関数で、テストからfetchをモックして
// 呼び出しを検証できるようにする
export async function run(env: NotifyEnv): Promise<void> {
  const workflowName = requireEnv(env, 'WORKFLOW_NAME')
  const conclusion = requireEnv(env, 'CONCLUSION')
  const event = requireEnv(env, 'EVENT')
  const createdAt = requireEnv(env, 'CREATED_AT')
  const updatedAt = requireEnv(env, 'UPDATED_AT')
  const htmlUrl = requireEnv(env, 'HTML_URL')

  const result = shouldNotify({ workflowName, conclusion, event, createdAt })

  // 実行元ワークフロー名・conclusion・判定結果(理由)を実行ログに記録する(design.md「ログ」)
  console.error(
    `監視対象ワークフロー: ${workflowName} / conclusion: ${conclusion} / event: ${event} / 判定: ${
      result.notify ? '通知する' : '通知しない'
    }(理由: ${result.reason})`
  )

  if (!result.notify) {
    return
  }

  const accessToken = requireEnv(env, 'LINE_CHANNEL_ACCESS_TOKEN')
  const adminUserId = requireEnv(env, 'LINE_ADMIN_USER_ID')
  const message = buildNotificationMessage({ workflowName, updatedAt, htmlUrl })

  const response = await fetch(LINE_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // トークンをログに出力しない(design.md「セキュリティ」「ログ」)
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to: adminUserId, messages: [{ type: 'text', text: message }] }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error(`LINE push APIがエラーを返しました: HTTP ${response.status}`)
    console.error(`レスポンス概要: ${errorBody}`)
    throw new Error(`LINE push APIがHTTP ${response.status}を返しました`)
  }

  console.error('LINE pushに成功しました')
}

async function main() {
  await run(process.env as NotifyEnv)
}

// CLIとして直接実行された場合のみmain()を起動する(テストからrunをimportした際にCLI
// (process.exit等)が動いてしまわないようにするガード)
const isMainModule = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
