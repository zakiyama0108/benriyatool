// 月次見直しの材料集めCLI(仕様: design.md「関連するファイル」)。
// 基準未達記録の集計(collectBelowCriteriaRecords)・フィードバックのSELECT(collectFeedback)は
// pg非依存の決定的ロジックとしてapp/ai-dev-digest/lib/reviewRecords.tsに実装済み(テストは
// __tests__/ai-dev-digest/lib/reviewRecords.test.tsで担保済み)。このファイルはpgのClientを
// 生成しSQL実行を注入するだけの薄いラッパーのためTDD対象外とする(tasks.md Task1〜2参照)。
// 依存関係(pg/dotenv)を本体package.jsonから隔離するため、このディレクトリは独立した
// package.jsonを持つ(.claude/skills/data-check/と同じ隔離パターン。tsconfig.json/eslint.config.mjsの
// 除外設定を参照)。
//
// 実行方法: cd scripts/ai-dev-digest/collect-review-data && npm install && \
//   SUPABASE_READONLY_DB_URL=xxx npx tsx collectReviewData.ts <YYYY-MM-DD>
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { collectBelowCriteriaRecords, collectFeedback } from '../../../app/ai-dev-digest/lib/reviewRecords'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 対話セッション向けの.env.local(docs/adr/0004。CIには含めない)を読み込む
config({ path: path.join(__dirname, '../../../.env.local') })

async function main() {
  const sinceDate = process.argv[2]
  if (!sinceDate) {
    console.error('使い方: collectReviewData.ts <YYYY-MM-DD>(集計対象期間の開始日)')
    process.exit(1)
  }

  const articlesDir = path.join(__dirname, '../../../content/ai-dev-digest/articles')
  const belowCriteria = collectBelowCriteriaRecords(articlesDir, sinceDate)

  const connectionString = process.env.SUPABASE_READONLY_DB_URL
  if (!connectionString) {
    console.error('SUPABASE_READONLY_DB_URL が設定されていません(docs/adr/0004参照)')
    process.exit(1)
  }

  const client = new pg.Client({ connectionString })
  await client.connect()
  try {
    const feedback = await collectFeedback(sinceDate, async (sql, params) => {
      const result = await client.query(sql, params)
      return result.rows as { article_date: string; topic_id: string; comment: string }[]
    })
    console.log(JSON.stringify({ sinceDate, belowCriteria, feedback }, null, 2))
  } finally {
    await client.end()
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
