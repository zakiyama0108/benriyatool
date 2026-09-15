// 月次見直しの材料集めCLI(仕様: source-review/design.md「見直しの材料を集める処理」)。
// 依存関係(pg/dotenv)を本体package.jsonから隔離するため、このディレクトリは独立した
// package.jsonを持つ(ai-dev-digestのcollect-review-data/と同じ隔離パターン。
// tsconfig.json/eslint.config.mjsの除外設定を参照)。DB接続・ファイルI/Oを伴う集計スクリプトの
// ためTDD対象外とする(source-review/tasks.md Task2参照)。
//
// 実行方法: cd scripts/trend-digest/collect-review-data && npm install && \
//   SUPABASE_READONLY_DB_URL=xxx npx tsx collectReviewData.ts <YYYY-MM-DD>
import { config } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import type { Edition, Genre } from '../../../app/trend-digest/lib/types'
import { GENRE_ORDER } from '../../../app/trend-digest/lib/types'
import { parseArticle } from '../../../app/trend-digest/lib/articleSchema'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 対話セッション向けの.env.local(docs/adr/0004。CIには含めない)を読み込む
config({ path: path.join(__dirname, '../../../.env.local') })

// 掲載見送り記録: ある回(記事)でGENRE_ORDER上のジャンルが1つもtopicsに含まれなかったもの
// (design.md「見直しの材料を集める処理」手順1、content-selection/requirements.md#情報源の健全性監視-1)
type SkippedGenreRecord = {
  date: string
  edition: Edition
  genre: Genre
}

// articlesDir配下の記事データのうち、sinceDate以降の日付を対象に、GENRE_ORDER上のジャンルで
// topicsに現れなかったものを列挙する。記事データがまだ1件もない運用開始直後は空配列を返す
function collectSkippedGenres(articlesDir: string, sinceDate: string): SkippedGenreRecord[] {
  if (!fs.existsSync(articlesDir)) return []

  const filenames = fs.readdirSync(articlesDir).filter((name) => name.endsWith('.json'))
  const records: SkippedGenreRecord[] = []

  for (const filename of filenames) {
    const raw: unknown = JSON.parse(fs.readFileSync(path.join(articlesDir, filename), 'utf8'))
    const article = parseArticle(raw, filename)
    if (article.date < sinceDate) continue

    const coveredGenres = new Set(article.topics.map((topic) => topic.genre))
    for (const genre of GENRE_ORDER[article.edition]) {
      if (!coveredGenres.has(genre)) {
        records.push({ date: article.date, edition: article.edition, genre })
      }
    }
  }

  return records.sort((a, b) => (a.date < b.date ? 1 : -1))
}

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
