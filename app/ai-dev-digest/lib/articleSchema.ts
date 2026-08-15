import type { Article, CurrentTopic, LegacyTopic, SourceType, SummarySection, Topic, TopicSummary } from './types'
import { isValidTeaserLength, isValidDetailLength, isValidSummaryDetailLength, isValidImportance } from './summaryValidation'

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

function isIsoDateTime(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && !Number.isNaN(Date.parse(value))
}

// topics[index].sections配列を検証・パースする(仕様: article-detail/design.md「バリデーション」)。
// 配列長2件以上、各セクションのheading/teaser/detailが空文字でないこと、teaserが
// TEASER_MIN_LENGTH〜TEASER_MAX_LENGTHの範囲内であること、detail合計文字数が
// DETAIL_TOTAL_MIN_LENGTH〜DETAIL_TOTAL_MAX_LENGTHの範囲内であることを確認する
function parseSections(raw: unknown, index: number): SummarySection[] {
  if (!Array.isArray(raw)) {
    throw new Error(`topics[${index}].sectionsが配列ではありません`)
  }

  const sections = raw.map((section, sectionIndex): SummarySection => {
    if (typeof section !== 'object' || section === null) {
      throw new Error(`topics[${index}].sections[${sectionIndex}]がオブジェクトではありません`)
    }
    const record = section as Record<string, unknown>
    if (!isNonEmptyString(record.heading)) {
      throw new Error(`topics[${index}].sections[${sectionIndex}].headingが空文字です`)
    }
    if (!isNonEmptyString(record.teaser)) {
      throw new Error(`topics[${index}].sections[${sectionIndex}].teaserが空文字です`)
    }
    if (!isNonEmptyString(record.detail)) {
      throw new Error(`topics[${index}].sections[${sectionIndex}].detailが空文字です`)
    }
    if (!isValidTeaserLength(record.teaser)) {
      throw new Error(
        `topics[${index}].sections[${sectionIndex}].teaserが不正です(40〜140字である必要があります): ${record.teaser.length}字`
      )
    }
    return { heading: record.heading, teaser: record.teaser, detail: record.detail }
  })

  if (!isValidDetailLength(sections)) {
    const totalLength = sections.reduce((sum, section) => sum + section.detail.length, 0)
    throw new Error(
      `topics[${index}].sectionsが不正です(配列長2件以上・detail合計800〜1700字である必要があります): 配列長${sections.length}件、detail合計${totalLength}字`
    )
  }

  return sections
}

// topics[index].summary(固定4観点)1つ分を検証・パースする(仕様: article-detail/design.md「バリデーション」)
function parsePerspective(raw: unknown, index: number, key: string) {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`topics[${index}].summary.${key}がオブジェクトではありません`)
  }
  const record = raw as Record<string, unknown>
  if (!isNonEmptyString(record.heading)) throw new Error(`topics[${index}].summary.${key}.headingが空文字です`)
  if (!isNonEmptyString(record.teaser)) throw new Error(`topics[${index}].summary.${key}.teaserが空文字です`)
  if (!isNonEmptyString(record.detail)) throw new Error(`topics[${index}].summary.${key}.detailが空文字です`)
  return { heading: record.heading, teaser: record.teaser, detail: record.detail }
}

// topics[index].summary(固定4観点)を検証・パースする。4キーの存在・各観点のteaser範囲・
// 4観点のdetail合計範囲はisValidSummaryDetailLengthが判定する(仕様: article-detail/design.md「バリデーション」)
function parseSummary(raw: unknown, index: number): TopicSummary {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`topics[${index}].summaryがオブジェクトではありません`)
  }
  const record = raw as Record<string, unknown>
  const summary: TopicSummary = {
    benefit: parsePerspective(record.benefit, index, 'benefit'),
    whatsNew: parsePerspective(record.whatsNew, index, 'whatsNew'),
    how: parsePerspective(record.how, index, 'how'),
    howToUse: parsePerspective(record.howToUse, index, 'howToUse'),
  }
  if (!isValidSummaryDetailLength(summary)) {
    throw new Error(
      `topics[${index}].summaryが不正です(各観点のteaserが40〜140字・4観点のdetail合計が800〜1700字である必要があります)`
    )
  }
  return summary
}

function parseTopic(raw: unknown, index: number): Topic {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`topics[${index}]がオブジェクトではありません`)
  }
  const topic = raw as Record<string, unknown>

  if (!isNonEmptyString(topic.id)) throw new Error(`topics[${index}].idが空文字です`)
  if (!isNonEmptyString(topic.heading)) throw new Error(`topics[${index}].headingが空文字です`)

  // sections(LegacyTopic)またはsummary+importance(CurrentTopic)のどちらか一方のみを持つこと
  // (2026-08追加。isLegacyTopicの判定と対になる制約。article-detail/design.md「バリデーション」)
  const hasSections = topic.sections !== undefined
  const hasSummary = topic.summary !== undefined
  if (hasSections === hasSummary) {
    throw new Error(
      `topics[${index}]はsections(旧形式)またはsummary+importance(新形式)のどちらか一方のみを持つ必要があります`
    )
  }

  if (typeof topic.sourceType !== 'string' || !SOURCE_TYPES.includes(topic.sourceType as SourceType)) {
    throw new Error(`topics[${index}].sourceTypeが未定義の種別です: ${String(topic.sourceType)}`)
  }
  if (!isNonEmptyString(topic.sourceName)) throw new Error(`topics[${index}].sourceNameが空文字です`)
  if (!isHttpUrl(topic.sourceUrl)) {
    throw new Error(`topics[${index}].sourceUrlがhttp/https形式の絶対URLではありません: ${String(topic.sourceUrl)}`)
  }
  if (topic.sourcePublishedAt !== undefined && !isIsoDateTime(topic.sourcePublishedAt)) {
    throw new Error(`topics[${index}].sourcePublishedAtがISO 8601形式の日時ではありません: ${JSON.stringify(topic.sourcePublishedAt)}`)
  }
  if (typeof topic.belowCriteria !== 'boolean') {
    throw new Error(`topics[${index}].belowCriteriaがboolean型ではありません`)
  }
  if (topic.belowCriteria && !isNonEmptyString(topic.belowCriteriaReason)) {
    throw new Error(`topics[${index}].belowCriteriaがtrueですがbelowCriteriaReasonが指定されていません`)
  }

  const base = {
    id: topic.id,
    heading: topic.heading,
    sourceType: topic.sourceType as SourceType,
    sourceName: topic.sourceName,
    sourceUrl: topic.sourceUrl,
    belowCriteria: topic.belowCriteria,
  }
  const optional: Partial<Pick<Topic, 'sourcePublishedAt' | 'youtubeVideoId' | 'belowCriteriaReason'>> = {}
  if (isNonEmptyString(topic.sourcePublishedAt)) optional.sourcePublishedAt = topic.sourcePublishedAt
  if (isNonEmptyString(topic.youtubeVideoId)) optional.youtubeVideoId = topic.youtubeVideoId
  if (isNonEmptyString(topic.belowCriteriaReason)) optional.belowCriteriaReason = topic.belowCriteriaReason

  if (hasSections) {
    const sections = parseSections(topic.sections, index)
    const result: LegacyTopic = { ...base, sections, ...optional }
    return result
  }

  const summary = parseSummary(topic.summary, index)
  if (!isValidImportance(topic.importance)) {
    throw new Error(`topics[${index}].importanceが不正です(1〜5の整数である必要があります): ${JSON.stringify(topic.importance)}`)
  }
  const result: CurrentTopic = { ...base, summary, importance: topic.importance, ...optional }
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
