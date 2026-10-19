// 月次見直しの材料集めCLI(仕様: source-review/design.md「見直しの材料を集める処理」)。
// 依存関係(pg/dotenv)を本体package.jsonから隔離するため、このディレクトリは独立した
// package.jsonを持つ(future-digestのcollect-review-data/と同じ隔離パターン。
// tsconfig.json/eslint.config.mjsの除外設定を参照)。DB接続・ファイルI/Oを伴う集計スクリプトの
// ためTDD対象外とする(source-review/tasks.md Task2参照)。ジャンルの集計ロジック自体は
// app/research-digest/lib/reviewRecords.tsでテスト済み。
//
// 実行方法: cd scripts/research-digest/collect-review-data && npm install && \
//   SUPABASE_READONLY_DB_URL=xxx npx tsx collectReviewData.ts <YYYY-MM-DD>(集計対象期間の開始日)
import { config } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { summarizeEmptyGenres } from '../../../app/research-digest/lib/reviewRecords'
import { getAllArticles } from '../../../app/research-digest/lib/articles'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 対話セッション向けの.env.local(docs/adr/0004。CIには含めない)を読み込む
config({ path: path.join(__dirname, '../../../.env.local') })

type FeedbackRecord = {
  articleId: string
  findingId: string
  comment: string
  createdAt: string
  // 対象の研究が記事データにまだ存在する場合のみ添える(design.md「見直しの材料を集める処理」手順4)
  finding?: { heading: string; genre: string }
}

type FeedbackRow = { article_id: string; finding_id: string; comment: string; created_at: string }

// research_digest_feedbackから、sinceDate以降・is_test=falseのレコードを取得する
// (design.md「見直しの材料を集める処理」手順3。is_test除外はdocs/adr/0001の集計時の共通ルール)。
// 領域(選定/生成)での絞り込みはしない(振り分けはClaudeが内容から行う)
async function collectFeedback(client: pg.Client, sinceDate: string): Promise<FeedbackRow[]> {
  const result = await client.query<FeedbackRow>(
    'select article_id, finding_id, comment, created_at from research_digest_feedback where created_at >= $1 and is_test = false order by created_at desc',
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
  // ワークフローはこのディレクトリ(scripts/research-digest/collect-review-data)をworking-directoryに
  // 実行するため、process.cwd()基準の既定パスに頼らずcontent/research-digest/articlesを明示する
  const articlesDir = path.join(__dirname, '../../../content/research-digest/articles')
  const articles = getAllArticles(articlesDir)
  // ジャンルごとの候補なし・有効回数の集計(design.md「見直しの材料を集める処理」手順1〜2、
  // app/research-digest/lib/reviewRecords.tsでテスト済み)
  const emptyGenreSummary = summarizeEmptyGenres(articles, sinceDate, today)

  const { rows, connectionError } = await collectFeedbackSafely(sinceDate)
  if (connectionError) {
    console.error(`research_digest_feedbackへの接続に失敗したため、フィードバックなしで続行します: ${connectionError}`)
  }

  // フィードバックの記事ID・研究IDから、対象の研究の見出し・ジャンルを記事データで引いて添える
  // (design.md「見直しの材料を集める処理」手順4。Claudeがどの記事への意見かを判断できるようにするため)
  const feedback: FeedbackRecord[] = rows.map((row) => {
    const article = articles.find((a) => a.id === row.article_id)
    const finding = article?.findings.find((f) => f.id === row.finding_id)
    return {
      articleId: row.article_id,
      findingId: row.finding_id,
      comment: row.comment,
      createdAt: row.created_at,
      ...(finding ? { finding: { heading: finding.heading, genre: finding.genre } } : {}),
    }
  })

  // 実行ログ(design.md「ログ」)。JSON出力(標準出力)を汚さないよう標準エラーに出す
  const ongoingCount = emptyGenreSummary.filter((s) => s.ongoing).length
  console.error(
    `集計期間: ${sinceDate}〜${today} / 候補なしのジャンル: ${emptyGenreSummary.filter((s) => s.noCandidateCount > 0).length}件(うち続いている: ${ongoingCount}件) / フィードバック: ${feedback.length}件 / DB接続: ${connectionError ? '失敗' : '成功'}`
  )

  console.log(JSON.stringify({ sinceDate, emptyGenreSummary, feedback }, null, 2))
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
