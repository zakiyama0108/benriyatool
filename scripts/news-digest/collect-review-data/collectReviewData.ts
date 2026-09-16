// 月次見直しの材料集めCLI(仕様: design.md「関連するファイル」)。
// 基準未達記録の集計(collectBelowCriteriaRecords)・フィードバックのSELECT(collectFeedback)は
// pg非依存の決定的ロジックとしてapp/news-digest/lib/reviewRecords.tsに実装済み(テストは
// __tests__/news-digest/lib/reviewRecords.test.tsで担保済み)。このファイルはpgのClientを
// 生成しSQL実行を注入するだけの薄いラッパーのためTDD対象外とする(tasks.md Task1参照)。
// 依存関係(pg/dotenv)を本体package.jsonから隔離するため、このディレクトリは独立した
// package.jsonを持つ(ai-dev-digest/trend-digestのcollect-review-dataと同じ隔離パターン。
// tsconfig.json/eslint.config.mjsの除外設定を参照)。
//
// 実行方法: cd scripts/news-digest/collect-review-data && npm install && \
//   SUPABASE_READONLY_DB_URL=xxx npx tsx collectReviewData.ts <YYYY-MM-DD>
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { collectBelowCriteriaRecords, collectFeedback, type FeedbackRecord } from '../../../app/news-digest/lib/reviewRecords'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 対話セッション向けの.env.local(docs/adr/0004。CIには含めない)を読み込む
config({ path: path.join(__dirname, '../../../.env.local') })

// news_digest_feedbackへの接続に失敗しても、フィードバックなしの状態(基準未達記録のみ)で
// 月次実行を続行する(design.md「エラーハンドリング」。DB接続の可否によって月次実行自体を
// 失敗させない)。接続失敗はGitHub Actionsの実行ログに残す
async function collectFeedbackSafely(sinceDate: string): Promise<{ feedback: FeedbackRecord[]; connectionError: string | null }> {
  const connectionString = process.env.SUPABASE_READONLY_DB_URL
  if (!connectionString) {
    return { feedback: [], connectionError: 'SUPABASE_READONLY_DB_URLが設定されていません(docs/adr/0004参照)' }
  }

  const client = new pg.Client({ connectionString })
  try {
    await client.connect()
    const feedback = await collectFeedback(sinceDate, async (sql, params) => {
      const result = await client.query(sql, params)
      return result.rows as { article_date: string; topic_id: string; comment: string }[]
    })
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

  const articlesDir = path.join(__dirname, '../../../content/news-digest/articles')
  const belowCriteria = collectBelowCriteriaRecords(articlesDir, sinceDate)
  const { feedback, connectionError } = await collectFeedbackSafely(sinceDate)

  if (connectionError) {
    console.error(`news_digest_feedbackへの接続に失敗したため、フィードバックなしで続行します: ${connectionError}`)
  }

  console.log(JSON.stringify({ sinceDate, belowCriteria, feedback }, null, 2))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
