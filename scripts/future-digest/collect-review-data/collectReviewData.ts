// 月次見直しの材料集めCLI(仕様: source-review/design.md「見直しの材料を集める処理」)。
// 依存関係(pg/dotenv)を本体package.jsonから隔離するため、このディレクトリは独立した
// package.jsonを持つ(trend-digestのcollect-review-data/と同じ隔離パターン。
// tsconfig.json/eslint.config.mjsの除外設定を参照)。DB接続・ファイルI/Oを伴う集計スクリプトの
// ためTDD対象外とする(source-review/tasks.md Task2参照)。枠の集計ロジック自体は
// app/future-digest/lib/reviewRecords.tsでテスト済み。
//
// 実行方法: cd scripts/future-digest/collect-review-data && npm install && \
//   SUPABASE_READONLY_DB_URL=xxx npx tsx collectReviewData.ts <YYYY-MM-DD>(集計対象期間の開始日)
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { summarizeEmptySlots } from '../../../app/future-digest/lib/reviewRecords'
import { getAllArticles } from '../../../app/future-digest/lib/articles'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 対話セッション向けの.env.local(docs/adr/0004。CIには含めない)を読み込む
config({ path: path.join(__dirname, '../../../.env.local') })

type FeedbackRecord = {
  articleId: string
  predictionId: string
  comment: string
  createdAt: string
  // 対象の予測が記事データにまだ存在する場合のみ添える(design.md「見直しの材料を集める処理」手順4)
  prediction?: { heading: string; genre: string; horizon: string }
}

type FeedbackRow = { article_id: string; prediction_id: string; comment: string; created_at: string }

// future_digest_feedbackから、sinceDate以降・is_test=falseのレコードを取得する
// (design.md「見直しの材料を集める処理」手順3。is_test除外はdocs/adr/0001の集計時の共通ルール)。
// 領域(選定/生成)での絞り込みはしない(振り分けはClaudeが内容から行う)
async function collectFeedback(client: pg.Client, sinceDate: string): Promise<FeedbackRow[]> {
  const result = await client.query<FeedbackRow>(
    'select article_id, prediction_id, comment, created_at from future_digest_feedback where created_at >= $1 and is_test = false order by created_at desc',
    [sinceDate]
  )
  return result.rows
}

// DB接続に失敗してもフィードバックなしの状態で処理を続行する(design.md「エラーハンドリング」1点目。
// DB接続の可否によって月次実行自体を失敗させない)。接続失敗はGitHub Actionsの実行ログに残す
async function collectFeedbackSafely(sinceDate: string): Promise<{ rows: FeedbackRow[]; connectionError: string | null }> {
  const connectionString = process.env.SUPABASE_READONLY_DB_URL
  if (!connectionString) {
    return { rows: [], connectionError: 'SUPABASE_READONLY_DB_URLが設定されていません(docs/adr/0004参照)' }
  }

  const client = new pg.Client({ connectionString })
  try {
    await client.connect()
    const rows = await collectFeedback(client, sinceDate)
    return { rows, connectionError: null }
  } catch (error) {
    return { rows: [], connectionError: error instanceof Error ? error.message : String(error) }
  } finally {
    await client.end().catch(() => {})
  }
}

async function main() {
  const sinceDate = process.argv[2]
  if (!sinceDate) {
    console.error('使い方: collectReviewData.ts <YYYY-MM-DD>(集計対象期間の開始日)')
    process.exit(1)
  }

  const today = new Date().toISOString().slice(0, 10)
  const articles = getAllArticles()
  // 枠(ジャンル×時間軸)ごとの候補なし・有効回数の集計(design.md「見直しの材料を集める処理」手順1〜2、
  // app/future-digest/lib/reviewRecords.tsでテスト済み)
  const emptySlotSummary = summarizeEmptySlots(articles, sinceDate, today)

  const { rows, connectionError } = await collectFeedbackSafely(sinceDate)
  if (connectionError) {
    console.error(`future_digest_feedbackへの接続に失敗したため、フィードバックなしで続行します: ${connectionError}`)
  }

  // フィードバックの記事ID・予測IDから、対象の予測の見出し・ジャンル・時間軸を記事データで引いて添える
  // (design.md「見直しの材料を集める処理」手順4。Claudeがどの記事への意見かを判断できるようにするため)
  const feedback: FeedbackRecord[] = rows.map((row) => {
    const article = articles.find((a) => a.id === row.article_id)
    const prediction = article?.predictions.find((p) => p.id === row.prediction_id)
    return {
      articleId: row.article_id,
      predictionId: row.prediction_id,
      comment: row.comment,
      createdAt: row.created_at,
      ...(prediction
        ? { prediction: { heading: prediction.heading, genre: prediction.genre, horizon: prediction.horizon } }
        : {}),
    }
  })

  console.log(JSON.stringify({ sinceDate, emptySlotSummary, feedback }, null, 2))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
