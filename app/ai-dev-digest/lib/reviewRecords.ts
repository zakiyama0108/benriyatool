import fs from 'node:fs'
import path from 'node:path'
import type { SourceType } from './types'
import { parseArticle } from './articleSchema'

// 月次見直しの材料集め(仕様: watchlist-review/requirements.md#見直しの実行-1、
// design.md「見直しの材料を集める処理」)。
// collectFeedbackはSQL実行を注入可能にしてpg依存を持たない設計にしている
// (fetchCandidates.tsのHttpClientと同じ設計判断)。design.mdは本ロジックを
// scripts/ai-dev-digest/collect-review-data/collectReviewData.tsに置く想定だが、
// そのディレクトリは独立した依存関係(pg/dotenv)を持つ隔離パッケージのため本体の
// tsconfigプロジェクトに含まれない(tsconfig.json参照)。pg非依存のこのロジック自体は
// 本体のvitestで完全にテストできるため、テスト可能性を保つ目的でapp/ai-dev-digest/lib/に置き、
// 隔離パッケージ側からはこのモジュールをimportして薄いCLIとして呼び出す(設計判断)

export type BelowCriteriaRecord = {
  date: string
  topicId: string
  sourceType: SourceType
  sourceName: string
  belowCriteriaReason: string
}

// 指定ディレクトリの記事データのうち、sinceDate以降の日付でbelowCriteria: trueのトピックを抽出する
// (design.md「見直しの材料を集める処理」手順1)
export function collectBelowCriteriaRecords(dir: string, sinceDate: string): BelowCriteriaRecord[] {
  if (!fs.existsSync(dir)) return []

  const filenames = fs.readdirSync(dir).filter((name) => name.endsWith('.json'))
  const records: BelowCriteriaRecord[] = []

  for (const filename of filenames) {
    const raw: unknown = JSON.parse(fs.readFileSync(path.join(dir, filename), 'utf8'))
    const article = parseArticle(raw, filename)
    if (article.date < sinceDate) continue

    for (const topic of article.topics) {
      if (!topic.belowCriteria) continue
      records.push({
        date: article.date,
        topicId: topic.id,
        sourceType: topic.sourceType,
        sourceName: topic.sourceName,
        belowCriteriaReason: topic.belowCriteriaReason ?? '',
      })
    }
  }

  return records.sort((a, b) => (a.date < b.date ? 1 : -1))
}

export type FeedbackRecord = {
  articleDate: string
  topicId: string
  comment: string
}

type FeedbackRow = { article_date: string; topic_id: string; comment: string }

// SQL実行そのものを注入可能にする(pgのClientを直接ここで生成しない)。
// 実際のpg接続はscripts/ai-dev-digest/collect-review-data/側の薄いCLIが担う
export type FeedbackQueryExecutor = (sql: string, params: unknown[]) => Promise<FeedbackRow[]>

// ai_dev_digest_feedbackから、sinceDate以降・is_test=falseのレコードを取得する
// (design.md「見直しの材料を集める処理」手順2。is_test除外はdocs/adr/0001の集計時の共通ルール)
export async function collectFeedback(sinceDate: string, executeQuery: FeedbackQueryExecutor): Promise<FeedbackRecord[]> {
  const rows = await executeQuery(
    'select article_date, topic_id, comment from ai_dev_digest_feedback where article_date >= $1 and is_test = false order by article_date desc',
    [sinceDate]
  )
  return rows.map((row) => ({ articleDate: row.article_date, topicId: row.topic_id, comment: row.comment }))
}
