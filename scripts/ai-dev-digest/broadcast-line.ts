// LINE公式アカウントへのブロードキャストメッセージ送信CLI(仕様: design.md「LINEブロードキャスト
// メッセージを送信する処理」)。記事データをparseArticleでパースし、buildBroadcastMessageで
// 本文を組み立ててLINE Messaging APIへPOSTするだけの薄いラッパーのため、TDD対象外とする
// (メッセージ組み立てロジック自体はbuildBroadcastMessage.test.tsで担保済み。tasks.md Task2参照)。
// リトライは行わない(requirements.md#無料枠と配信失敗時の扱い-4〜5)。
//
// 実行方法: LINE_CHANNEL_ACCESS_TOKEN=xxx npx tsx scripts/ai-dev-digest/broadcast-line.ts content/ai-dev-digest/articles/2026-08-01.json
import fs from 'node:fs'
import path from 'node:path'
import { parseArticle } from '../../app/ai-dev-digest/lib/articleSchema'
import { buildBroadcastMessage } from '../../app/ai-dev-digest/lib/buildBroadcastMessage'
import { buildArticleUrl } from '../../app/ai-dev-digest/lib/articleUrl'
import { waitForPageAvailable } from '../../app/lib/waitForPageAvailable'

const BROADCAST_ENDPOINT = 'https://api.line.me/v2/bot/message/broadcast'

async function main() {
  const articlePath = process.argv[2]
  if (!articlePath) {
    console.error('使い方: broadcast-line.ts <記事データ(<date>.json)のパス>')
    process.exit(1)
  }

  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!accessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN が環境変数に設定されていません(GitHub Actions Secretsの設定。design.md「実行環境の前提」参照)')
    process.exit(1)
  }

  // 記事データのパースに失敗した場合は配信を行わず異常終了させる(design.md「エラーハンドリング」)
  const filename = path.basename(articlePath)
  const raw: unknown = JSON.parse(fs.readFileSync(articlePath, 'utf8'))
  const article = parseArticle(raw, filename)

  const message = buildBroadcastMessage(article)
  console.error(`配信対象日付: ${article.date} / トピック数: ${article.topics.length}件`)

  // 記事詳細ページが本番サイトで実際に閲覧可能になったことを確認してから配信する
  // (requirements.md#配信タイミング・方式-8〜9、design.md「記事ページの公開を待つ処理」)。
  // 試行ごとの経過秒数・HTTPステータスはonAttemptを通じて実行ログ(console.error)に記録する
  // (design.md「記事ページの公開を待つ処理」手順5・「ログ」参照。このファイルはno-consoleの
  // 例外対象のためconsole.errorを直接呼べる)
  const waitResult = await waitForPageAvailable(buildArticleUrl(article), {
    onAttempt: ({ elapsedSeconds, status }) => {
      console.error(`記事ページ公開待ち: 経過${elapsedSeconds}秒 / HTTPステータス ${status}`)
    },
  })

  if (!waitResult.available) {
    // 公開が確認できないまま時間切れになった場合、LINE APIを呼ばずに異常終了する
    // (requirements.md#配信タイミング・方式-9、design.md「エラーハンドリング」)
    console.error(
      `記事ページの公開を確認できませんでした: 最後に観測したHTTPステータス ${waitResult.lastStatus} / 経過時間 ${waitResult.elapsedMs}ms`
    )
    process.exit(1)
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
    // リトライはせず、HTTPステータス・エラーレスポンス概要を記録して失敗させる
    // (design.md「エラーハンドリング」、requirements.md#無料枠と配信失敗時の扱い-4〜6)
    const errorBody = await response.text()
    console.error(`LINE配信APIがエラーを返しました: HTTP ${response.status}`)
    console.error(`レスポンス概要: ${errorBody}`)
    process.exit(1)
  }

  console.error('LINE配信に成功しました')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
