// LINE公式アカウントへのブロードキャストメッセージ送信CLI(仕様: design.md「LINEブロードキャスト
// メッセージを送信する処理」)。記事データをparseArticleでパースし、buildBroadcastMessageで
// 本文を組み立ててLINE Messaging APIへPOSTする。
// リトライは行わない(requirements.md#無料枠と配信失敗時の扱い-4〜5)。
//
// 実行方法: LINE_CHANNEL_ACCESS_TOKEN=xxx npx tsx scripts/trend-digest/broadcast-line.ts content/trend-digest/articles/2026-09-15-entertainment.json
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArticle } from '../../app/trend-digest/lib/articleSchema'
import { buildBroadcastMessage } from '../../app/trend-digest/lib/buildBroadcastMessage'
import { buildArticleUrl } from '../../app/trend-digest/lib/articleUrl'
import { waitForPageAvailable } from '../../app/lib/waitForPageAvailable'

const BROADCAST_ENDPOINT = 'https://api.line.me/v2/bot/message/broadcast'

// 記事ページ公開待ちの設定を差し替えるための任意引数(design.md「記事ページの公開を待つ処理」
// 「テストからの注入」)。既定値は本番用(waitForPageAvailable既定の15秒・10分)のままとし、
// テストだけが短い値・フェイクのsleepを渡せるようにする
export type WaitForPageAvailableSettings = {
  pollIntervalMs?: number
  timeoutMs?: number
  sleep?: (ms: number) => Promise<void>
}

// 記事データを読み込み、LINE Messaging APIへブロードキャスト配信する(design.md「LINEブロード
// キャストメッセージを送信する処理」)。CLI実行用のmain()から切り出した薄い関数で、
// 成否をboolean で返す(HTTPクライアントをモックしたテストで成功/失敗の記録を検証できるように
// するため。tasks.md Task4)。記事データのパースに失敗した場合は配信を行わず例外を投げる
// (design.md「エラーハンドリング」)。LINE配信APIがエラーを返した場合はリトライせずfalseを返す
// (requirements.md#無料枠と配信失敗時の扱い-3〜5)
export async function broadcastArticle(
  articlePath: string,
  accessToken: string,
  waitSettings?: WaitForPageAvailableSettings
): Promise<boolean> {
  const filename = path.basename(articlePath)
  const raw: unknown = JSON.parse(fs.readFileSync(articlePath, 'utf8'))
  const article = parseArticle(raw, filename)

  const message = buildBroadcastMessage(article)
  console.error(`配信対象ID: ${article.id} / トピック数: ${article.topics.length}件`)

  // 記事詳細ページが本番サイトで実際に閲覧可能になったことを確認してから配信する
  // (requirements.md#配信タイミング・方式-8〜9、design.md「記事ページの公開を待つ処理」)。
  // 試行ごとの経過秒数・HTTPステータスはonAttemptを通じて実行ログ(console.error)に記録する
  // (design.md「記事ページの公開を待つ処理」手順5・「ログ」参照。このファイルはno-consoleの
  // 例外対象のためconsole.errorを直接呼べる)
  const waitResult = await waitForPageAvailable(buildArticleUrl(article), {
    pollIntervalMs: waitSettings?.pollIntervalMs,
    timeoutMs: waitSettings?.timeoutMs,
    sleep: waitSettings?.sleep,
    onAttempt: ({ elapsedSeconds, status }) => {
      console.error(`記事ページ公開待ち: 経過${elapsedSeconds}秒 / HTTPステータス ${status}`)
    },
  })

  if (!waitResult.available) {
    // 公開が確認できないまま時間切れになった場合、LINE APIを呼ばずに失敗を返す
    // (requirements.md#配信タイミング・方式-9、design.md「エラーハンドリング」)
    console.error(
      `記事ページの公開を確認できませんでした: 最後に観測したHTTPステータス ${waitResult.lastStatus} / 経過時間 ${waitResult.elapsedMs}ms`
    )
    return false
  }

  const response = await fetch(BROADCAST_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // トークンをログに出力しない(design.md「ログ」)
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ messages: [{ type: 'text', text: message }] }),
  })

  if (!response.ok) {
    // リトライはせず、HTTPステータス・エラーレスポンス概要を記録して失敗を返す
    // (design.md「エラーハンドリング」、requirements.md#無料枠と配信失敗時の扱い-3〜5)
    const errorBody = await response.text()
    console.error(`LINE配信APIがエラーを返しました: HTTP ${response.status}`)
    console.error(`レスポンス概要: ${errorBody}`)
    return false
  }

  console.error('LINE配信に成功しました')
  return true
}

async function main() {
  const articlePath = process.argv[2]
  if (!articlePath) {
    console.error('使い方: broadcast-line.ts <記事データ(<id>.json)のパス>')
    process.exit(1)
  }

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!accessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN が環境変数に設定されていません(GitHub Actions Secretsの設定。design.md「実行環境の前提」参照)')
    process.exit(1)
  }

  const success = await broadcastArticle(articlePath, accessToken)
  process.exit(success ? 0 : 1)
}

// CLIとして直接実行された場合のみmain()を起動する(テストからbroadcastArticleをimportした
// 際にCLI(process.exit等)が動いてしまわないようにするガード)
const isMainModule = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
