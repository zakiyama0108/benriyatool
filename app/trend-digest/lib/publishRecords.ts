import fs from 'node:fs'
import path from 'node:path'
import type { DurationLabel } from './historyTypes'
import { normalizeTitle } from './selection'
import { parseArticle } from './articleSchema'

// 掲載実績(掲載回数・報告回数・直近掲載時の継続度ラベル)の算出(仕様: requirements.md#掲載実績の追跡-13〜14、
// design.md「掲載実績(掲載回数・直近掲載時の継続度ラベル)を求める処理」)。
// articlesDirを引数で受け取る形にして一時ディレクトリでテストする(既存のreviewRecords.tsと同じ書き方)

export type PublishRecord = {
  publishedCount: number // 過去に記事へ掲載された回数(未掲載は0)
  reportCount: number // 今回掲載する場合に通算何回目の報告になるか(= publishedCount + 1)
  lastPublishedDurationLabel: DurationLabel | null // 直近掲載時の継続度ラベル。未掲載・判定不能はnull
  lastPublishedBody: string | null // 直近掲載時の本文。未掲載はnull。content-generationが続報の重複執筆を防ぐ検証に使う
}

const NEVER_PUBLISHED: PublishRecord = {
  publishedCount: 0,
  reportCount: 1,
  lastPublishedDurationLabel: null,
  lastPublishedBody: null,
}

// 正規化タイトル(selection.tsのnormalizeTitle)をキーにした掲載実績の一覧。
// lookupPublishRecordで未掲載時のデフォルト値を含めて引く
export function collectPublishRecords(articlesDir: string): Map<string, PublishRecord> {
  const records = new Map<string, PublishRecord>()
  if (!fs.existsSync(articlesDir)) return records

  const filenames = fs.readdirSync(articlesDir).filter((name) => name.endsWith('.json'))
  const articles = filenames
    .map((filename) => {
      const raw: unknown = JSON.parse(fs.readFileSync(path.join(articlesDir, filename), 'utf8'))
      return parseArticle(raw, filename)
    })
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  for (const article of articles) {
    for (const topic of article.topics) {
      const key = normalizeTitle(topic.sourceTitle)
      const publishedCount = (records.get(key)?.publishedCount ?? 0) + 1
      records.set(key, {
        publishedCount,
        reportCount: publishedCount + 1,
        lastPublishedDurationLabel: topic.trend?.durationLabel ?? null,
        lastPublishedBody: topic.body,
      })
    }
  }

  return records
}

// records(collectPublishRecordsの結果)から正規化タイトルの掲載実績を引く。
// 未掲載の話題は掲載回数0・報告回数1・直近掲載時のラベルnullとして返す
export function lookupPublishRecord(records: Map<string, PublishRecord>, normalizedTitle: string): PublishRecord {
  return records.get(normalizedTitle) ?? NEVER_PUBLISHED
}
