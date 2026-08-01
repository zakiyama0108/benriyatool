import type { Article, SourceType, Topic } from './types'
import { isValidSummaryLength } from './summaryValidation'

// 記事データ(JSONファイル)のスキーマ検証(仕様: design.md「バリデーション」)。
// エージェントが生成する入力の事故を早期に検知するため、ビルド時にここで例外を投げて
// next buildを失敗させる(article-detail/design.md#エラーハンドリング)

const SOURCE_TYPES: SourceType[] = ['official', 'individual-youtube', 'individual-blog', 'qiita', 'zenn']
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const MAX_TOPICS = 5

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function parseTopic(raw: unknown, index: number): Topic {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`topics[${index}]がオブジェクトではありません`)
  }
  const topic = raw as Record<string, unknown>

  if (!isNonEmptyString(topic.id)) throw new Error(`topics[${index}].idが空文字です`)
  if (!isNonEmptyString(topic.heading)) throw new Error(`topics[${index}].headingが空文字です`)
  if (!isNonEmptyString(topic.summary)) throw new Error(`topics[${index}].summaryが空文字です`)
  if (!isValidSummaryLength(topic.summary)) {
    throw new Error(`topics[${index}].summaryの文字数が範囲外です(80〜170字である必要があります): ${topic.summary.length}字`)
  }
  if (typeof topic.sourceType !== 'string' || !SOURCE_TYPES.includes(topic.sourceType as SourceType)) {
    throw new Error(`topics[${index}].sourceTypeが未定義の種別です: ${String(topic.sourceType)}`)
  }
  if (!isNonEmptyString(topic.sourceName)) throw new Error(`topics[${index}].sourceNameが空文字です`)
  if (!isHttpUrl(topic.sourceUrl)) {
    throw new Error(`topics[${index}].sourceUrlがhttp/https形式の絶対URLではありません: ${String(topic.sourceUrl)}`)
  }
  if (typeof topic.belowCriteria !== 'boolean') {
    throw new Error(`topics[${index}].belowCriteriaがboolean型ではありません`)
  }
  if (topic.belowCriteria && !isNonEmptyString(topic.belowCriteriaReason)) {
    throw new Error(`topics[${index}].belowCriteriaがtrueですがbelowCriteriaReasonが指定されていません`)
  }

  const result: Topic = {
    id: topic.id,
    heading: topic.heading,
    summary: topic.summary,
    sourceType: topic.sourceType as SourceType,
    sourceName: topic.sourceName,
    sourceUrl: topic.sourceUrl,
    belowCriteria: topic.belowCriteria,
  }
  if (isNonEmptyString(topic.youtubeVideoId)) result.youtubeVideoId = topic.youtubeVideoId
  if (isNonEmptyString(topic.belowCriteriaReason)) result.belowCriteriaReason = topic.belowCriteriaReason

  return result
}

// 記事データ(JSON)を検証・パースする。違反時は例外を投げる(next buildを失敗させる想定)。
// filenameは拡張子有無を問わず受け取り、dateとの一致確認に使う
export function parseArticle(raw: unknown, filename: string): Article {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${filename}: 記事データがオブジェクトではありません`)
  }
  const data = raw as Record<string, unknown>

  if (typeof data.date !== 'string' || !DATE_FORMAT.test(data.date)) {
    throw new Error(`${filename}: dateがYYYY-MM-DD形式ではありません: ${String(data.date)}`)
  }

  const expectedFilename = `${data.date}.json`
  if (filename !== expectedFilename && filename !== data.date) {
    throw new Error(`${filename}: dateとファイル名が一致しません(date: ${data.date})`)
  }

  if (!Array.isArray(data.topics) || data.topics.length < 1 || data.topics.length > MAX_TOPICS) {
    throw new Error(
      `${filename}: topicsは1件以上${MAX_TOPICS}件以下である必要があります(実際: ${Array.isArray(data.topics) ? data.topics.length : '配列以外'}件)`
    )
  }

  const topics = data.topics.map((topic, index) => parseTopic(topic, index))

  const ids = topics.map((topic) => topic.id)
  const uniqueIds = new Set(ids)
  if (uniqueIds.size !== ids.length) {
    throw new Error(`${filename}: topics内でidが重複しています`)
  }

  return { date: data.date, topics }
}
