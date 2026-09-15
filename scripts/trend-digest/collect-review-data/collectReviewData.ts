// 月次見直しの材料集めCLI(仕様: source-review/design.md「見直しの材料を集める処理」)。
// 依存関係(pg/dotenv)を本体package.jsonから隔離するため、このディレクトリは独立した
// package.jsonを持つ(ai-dev-digestのcollect-review-data/と同じ隔離パターン。
// tsconfig.json/eslint.config.mjsの除外設定を参照)。DB接続・ファイルI/Oを伴う集計スクリプトの
// ためTDD対象外とする(source-review/tasks.md Task2参照)。
//
// 実行方法: cd scripts/trend-digest/collect-review-data && npm install && \
//   SUPABASE_READONLY_DB_URL=xxx npx tsx collectReviewData.ts <YYYY-MM-DD>
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { collectSkippedGenres } from '../../../app/trend-digest/lib/reviewRecords'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 対話セッション向けの.env.local(docs/adr/0004。CIには含めない)を読み込む
config({ path: path.join(__dirname, '../../../.env.local') })

type FeedbackRecord = {
  articleId: string
  topicId: string
  comment: string
  createdAt: string
}

type FeedbackRow = { article_id: string; topic_id: string; comment: string; created_at: string }

// trend_digest_feedbackから、sinceDate以降・is_test=falseのレコードを取得する
// (design.md「見直しの材料を集める処理」手順2。is_test除外はdocs/adr/0001の集計時の共通ルール)。
// このテーブルにarticle_date列はないため、フィードバックの投稿日時(created_at)で絞り込む
async function collectFeedback(client: pg.Client, sinceDate: string): Promise<FeedbackRecord[]> {
  const result = await client.query<FeedbackRow>(
    'select article_id, topic_id, comment, created_at from trend_digest_feedback where created_at >= $1 and is_test = false order by created_at desc',
    [sinceDate]
  )
  return result.rows.map((row) => ({
    articleId: row.article_id,
    topicId: row.topic_id,
    comment: row.comment,
    createdAt: row.created_at,
  }))
}

// DB接続に失敗してもフィードバックなしの状態で処理を続行する(design.md「エラーハンドリング」1点目。
// DB接続の可否によって月次実行自体を失敗させない)。接続失敗はGitHub Actionsの実行ログに残す
async function collectFeedbackSafely(sinceDate: string): Promise<{ feedback: FeedbackRecord[]; connectionError: string | null }> {
  const connectionString = process.env.SUPABASE_READONLY_DB_URL
  if (!connectionString) {
    return { feedback: [], connectionError: 'SUPABASE_READONLY_DB_URLが設定されていません(docs/adr/0004参照)' }
  }

  const client = new pg.Client({ connectionString })
  try {
    await client.connect()
    const feedback = await collectFeedback(client, sinceDate)
    return { feedback, connectionError: null }
  } catch (error) {
    return { feedback: [], connectionError: error instanceof Error ? error.message : String(error) }
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

  const articlesDir = path.join(__dirname, '../../../content/trend-digest/articles')
  const skippedGenres = collectSkippedGenres(articlesDir, sinceDate)
  const { feedback, connectionError } = await collectFeedbackSafely(sinceDate)

  if (connectionError) {
    console.error(`trend_digest_feedbackへの接続に失敗したため、フィードバックなしで続行します: ${connectionError}`)
  }

  console.log(JSON.stringify({ sinceDate, skippedGenres, feedback }, null, 2))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
