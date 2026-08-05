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
