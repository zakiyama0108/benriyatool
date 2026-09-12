import type { Article, Category, SummaryPerspective, Topic, TopicSummary } from './types'

// 記事データ(JSONファイル)のスキーマ検証(仕様: design.md「バリデーション」)。
// エージェントが生成する入力の事故を早期に検知するため、ビルド時にここで例外を投げて
// next buildを失敗させる(article-detail/design.md#エラーハンドリング)

const CATEGORIES: Category[] = ['general', 'business', 'kanagawa', 'childcare']
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const MIN_TOPICS = 1
const MAX_TOPICS = 7

// 導入文(teaser)の分量検証の範囲。「60〜120字程度」の「程度」を、ai-dev-digestの
// 要約分量チェック(目安100〜150字に対し±20字の許容幅)と同じ絶対値の許容幅として解釈し、
// 40〜140字を有効範囲とする(要件は許容幅の数値までは定めていないため設計判断)
const TEASER_MIN_LENGTH = 40
const TEASER_MAX_LENGTH = 140

// 詳細文(detail)合計の分量検証の範囲。「1000〜1500字程度」の「程度」を、ai-dev-digestの
// 要約分量チェックと同じ比率の許容幅(約±20%)として解釈し、800〜1700字を有効範囲とする
const DETAIL_TOTAL_MIN_LENGTH = 800
const DETAIL_TOTAL_MAX_LENGTH = 1700

// 固定4観点。この4キー・この順序で固定(content-generation/requirements.md#要約-4)
const SUMMARY_KEYS = ['whatHappened', 'whyItMatters', 'background', 'outlook'] as const

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

function isValidImportance(value: unknown): value is Topic['importance'] {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5
}

// topics[index].summary.<key>(固定4観点1つ分)を検証・パースする(仕様: design.md「バリデーション」)。
// heading/teaser/detailが空文字でないこと、teaserがTEASER_MIN_LENGTH〜TEASER_MAX_LENGTHの
// 範囲内であることを確認する
function parsePerspective(raw: unknown, index: number, key: string): SummaryPerspective {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`topics[${index}].summary.${key}がオブジェクトではありません`)
  }
  const record = raw as Record<string, unknown>
  if (!isNonEmptyString(record.heading)) throw new Error(`topics[${index}].summary.${key}.headingが空文字です`)
  if (!isNonEmptyString(record.teaser)) throw new Error(`topics[${index}].summary.${key}.teaserが空文字です`)
  if (!isNonEmptyString(record.detail)) throw new Error(`topics[${index}].summary.${key}.detailが空文字です`)
  if (record.teaser.length < TEASER_MIN_LENGTH || record.teaser.length > TEASER_MAX_LENGTH) {
    throw new Error(
      `topics[${index}].summary.${key}.teaserが不正です(40〜140字である必要があります): ${record.teaser.length}字`
    )
  }
  return { heading: record.heading, teaser: record.teaser, detail: record.detail }
}

// topics[index].summary(固定4観点)を検証・パースする。4キーの存在・各観点のteaser範囲・
// 4観点のdetail合計範囲を確認する(仕様: design.md「バリデーション」)
function parseSummary(raw: unknown, index: number): TopicSummary {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`topics[${index}].summaryがオブジェクトではありません`)
  }
  const record = raw as Record<string, unknown>
  const summary: TopicSummary = {
    whatHappened: parsePerspective(record.whatHappened, index, 'whatHappened'),
    whyItMatters: parsePerspective(record.whyItMatters, index, 'whyItMatters'),
    background: parsePerspective(record.background, index, 'background'),
    outlook: parsePerspective(record.outlook, index, 'outlook'),
  }

  const totalLength = SUMMARY_KEYS.reduce((sum, key) => sum + summary[key].detail.length, 0)
  if (totalLength < DETAIL_TOTAL_MIN_LENGTH || totalLength > DETAIL_TOTAL_MAX_LENGTH) {
    throw new Error(
      `topics[${index}].summaryのdetail合計文字数が不正です(800〜1700字である必要があります): ${totalLength}字`
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
  if (typeof topic.category !== 'string' || !CATEGORIES.includes(topic.category as Category)) {
    throw new Error(`topics[${index}].categoryが未定義のカテゴリです: ${String(topic.category)}`)
  }
  if (!isNonEmptyString(topic.sourceName)) throw new Error(`topics[${index}].sourceNameが空文字です`)
  if (!isHttpUrl(topic.sourceUrl)) {
    throw new Error(`topics[${index}].sourceUrlがhttp/https形式の絶対URLではありません: ${String(topic.sourceUrl)}`)
  }
  if (topic.sourcePublishedAt !== undefined && !isIsoDateTime(topic.sourcePublishedAt)) {
    throw new Error(
      `topics[${index}].sourcePublishedAtがISO 8601形式の日時ではありません: ${JSON.stringify(topic.sourcePublishedAt)}`
    )
  }
  if (typeof topic.belowCriteria !== 'boolean') {
    throw new Error(`topics[${index}].belowCriteriaがboolean型ではありません`)
  }
  if (topic.belowCriteria && !isNonEmptyString(topic.belowCriteriaReason)) {
    throw new Error(`topics[${index}].belowCriteriaがtrueですがbelowCriteriaReasonが指定されていません`)
  }
  if (!isValidImportance(topic.importance)) {
    throw new Error(`topics[${index}].importanceが不正です(1〜5の整数である必要があります): ${JSON.stringify(topic.importance)}`)
  }

  const summary = parseSummary(topic.summary, index)

  const base = {
    id: topic.id,
    heading: topic.heading,
    category: topic.category as Category,
    summary,
    importance: topic.importance,
    sourceName: topic.sourceName,
    sourceUrl: topic.sourceUrl,
    belowCriteria: topic.belowCriteria,
  }
  const optional: Partial<Pick<Topic, 'sourcePublishedAt' | 'belowCriteriaReason'>> = {}
  if (isNonEmptyString(topic.sourcePublishedAt)) optional.sourcePublishedAt = topic.sourcePublishedAt
  if (isNonEmptyString(topic.belowCriteriaReason)) optional.belowCriteriaReason = topic.belowCriteriaReason

  return { ...base, ...optional }
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

  if (!Array.isArray(data.topics) || data.topics.length < MIN_TOPICS || data.topics.length > MAX_TOPICS) {
    throw new Error(
      `${filename}: topicsは${MIN_TOPICS}件以上${MAX_TOPICS}件以下である必要があります(実際: ${Array.isArray(data.topics) ? data.topics.length : '配列以外'}件)`
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
