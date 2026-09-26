import type { Article, Edition, Genre, Topic, TopicTrend } from './types'
import { GENRE_ORDER } from './types'
import type { DurationLabel, HeatLabel } from './historyTypes'
import { BODY_MIN_LENGTH, BODY_MAX_LENGTH, isValidTopicBodyLength } from './bodyValidation'

// 記事データ(JSONファイル)のスキーマ検証(仕様: design.md「バリデーション」)。
// エージェントが生成する入力の事故を早期に検知するため、ビルド時にここで例外を投げて
// next buildを失敗させる(article-detail/design.md#エラーハンドリング)。
// 本文の分量検証はcontent-generationがオーナーのbodyValidation.tsに委ねる(重複実装しない)

const EDITIONS: Edition[] = ['entertainment', 'culture-lifestyle']
const ALL_GENRES: Genre[] = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
// 各ジャンルから必ず1件を掲載する仕様のため、同一ジャンルのトピックは1件までしか許容しない
// (旧仕様は2件/ジャンルまで許容していたが、継続度・注目度対応の改訂で1件/ジャンルに変更された)
const MAX_TOPICS_PER_GENRE = 1
const DURATION_LABELS: DurationLabel[] = ['pre-trend', 'emerging', 'talked', 'highly-talked']
const HEAT_LABELS: HeatLabel[] = ['high', 'normal', 'low']
// 地域情報(originRegion・currentRegions)は収集エージェントが生成した自由文字列のため、
// 記事データに取り込む時点でも外部入力として検証する(trend-history/design.mdのバリデーションと同じ上限)
const REGION_MAX_LENGTH = 50
const MAX_REGIONS = 10

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

const CONTROL_CHAR = /[\x00-\x1F\x7F]/

// 地域名として妥当な文字列か(空文字でなく50文字以内・制御文字を含まない)
function isValidRegionString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= REGION_MAX_LENGTH && !CONTROL_CHAR.test(value)
}

// topic.trend(継続度・注目度の情報)を検証・パースする(仕様: design.md「バリデーション」)。
// 省略可(この機能より前に公開した記事はtrendを持たないため。requirements.md#継続度・注目度の表示-18)。
// continuationStartDateはarticleDate(記事の発行日)以前であることを検証する
function parseTrend(raw: unknown, index: number, articleDate: string): TopicTrend | undefined {
  if (raw === undefined) return undefined
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`topics[${index}].trendがオブジェクトではありません`)
  }
  const trend = raw as Record<string, unknown>

  if (typeof trend.durationLabel !== 'string' || !DURATION_LABELS.includes(trend.durationLabel as DurationLabel)) {
    throw new Error(`topics[${index}].trend.durationLabelが未定義の値です: ${String(trend.durationLabel)}`)
  }
  if (typeof trend.heatLabel !== 'string' || !HEAT_LABELS.includes(trend.heatLabel as HeatLabel)) {
    throw new Error(`topics[${index}].trend.heatLabelが未定義の値です: ${String(trend.heatLabel)}`)
  }
  if (typeof trend.continuationDays !== 'number' || !Number.isInteger(trend.continuationDays) || trend.continuationDays < 0) {
    throw new Error(`topics[${index}].trend.continuationDaysは0以上の整数である必要があります: ${String(trend.continuationDays)}`)
  }
  if (typeof trend.continuationStartDate !== 'string' || !DATE_FORMAT.test(trend.continuationStartDate)) {
    throw new Error(`topics[${index}].trend.continuationStartDateがYYYY-MM-DD形式ではありません: ${String(trend.continuationStartDate)}`)
  }
  if (trend.continuationStartDate > articleDate) {
    throw new Error(
      `topics[${index}].trend.continuationStartDateが記事のdate(${articleDate})より後になっています: ${trend.continuationStartDate}`
    )
  }
  if (typeof trend.reportCount !== 'number' || !Number.isInteger(trend.reportCount) || trend.reportCount < 1) {
    throw new Error(`topics[${index}].trend.reportCountは1以上の整数である必要があります: ${String(trend.reportCount)}`)
  }
  if (trend.originRegion !== null && !isValidRegionString(trend.originRegion)) {
    throw new Error(`topics[${index}].trend.originRegionが不正です(nullまたは1〜${REGION_MAX_LENGTH}文字の制御文字を含まない文字列): ${JSON.stringify(trend.originRegion)}`)
  }
  if (!Array.isArray(trend.currentRegions) || trend.currentRegions.length > MAX_REGIONS) {
    throw new Error(`topics[${index}].trend.currentRegionsは${MAX_REGIONS}件以内の配列である必要があります`)
  }
  for (const region of trend.currentRegions) {
    if (!isValidRegionString(region)) {
      throw new Error(`topics[${index}].trend.currentRegionsの要素が不正です(1〜${REGION_MAX_LENGTH}文字の制御文字を含まない文字列): ${String(region)}`)
    }
  }

  return {
    durationLabel: trend.durationLabel as DurationLabel,
    heatLabel: trend.heatLabel as HeatLabel,
    continuationDays: trend.continuationDays,
    continuationStartDate: trend.continuationStartDate,
    reportCount: trend.reportCount,
    originRegion: trend.originRegion,
    currentRegions: trend.currentRegions as string[],
  }
}

// topics[index]1件を検証・パースする(仕様: article-detail/design.md「バリデーション」)。
// editionはジャンルが対象ジャンルに属するかの照合に、articleDateはtrend.continuationStartDateの
// 妥当性検証に使う
function parseTopic(raw: unknown, index: number, edition: Edition, articleDate: string): Topic {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`topics[${index}]がオブジェクトではありません`)
  }
  const topic = raw as Record<string, unknown>

  if (!isNonEmptyString(topic.id)) throw new Error(`topics[${index}].idが空文字です`)

  if (typeof topic.genre !== 'string' || !ALL_GENRES.includes(topic.genre as Genre)) {
    throw new Error(`topics[${index}].genreが未定義のジャンルです: ${String(topic.genre)}`)
  }
  const genre = topic.genre as Genre
  if (!GENRE_ORDER[edition].includes(genre)) {
    throw new Error(
      `topics[${index}].genre(${genre})はedition(${edition})に対応するジャンルに含まれていません`
    )
  }

  if (!isNonEmptyString(topic.heading)) throw new Error(`topics[${index}].headingが空文字です`)

  if (!isNonEmptyString(topic.body)) throw new Error(`topics[${index}].bodyが空文字です`)
  if (!isValidTopicBodyLength(topic.body)) {
    throw new Error(
      `topics[${index}].bodyの文字数が不正です(${BODY_MIN_LENGTH}〜${BODY_MAX_LENGTH}字である必要があります): ${topic.body.length}字`
    )
  }

  if (!isNonEmptyString(topic.sourceTitle)) throw new Error(`topics[${index}].sourceTitleが空文字です`)
  if (!isNonEmptyString(topic.sourceName)) throw new Error(`topics[${index}].sourceNameが空文字です`)
  if (!isHttpUrl(topic.sourceUrl)) {
    throw new Error(`topics[${index}].sourceUrlがhttp/https形式の絶対URLではありません: ${String(topic.sourceUrl)}`)
  }

  const trend = parseTrend(topic.trend, index, articleDate)

  return {
    id: topic.id,
    genre,
    heading: topic.heading,
    body: topic.body,
    sourceTitle: topic.sourceTitle,
    sourceName: topic.sourceName,
    sourceUrl: topic.sourceUrl,
    ...(trend !== undefined ? { trend } : {}),
  }
}

// unavailableGenres(情報源から話題を取得できなかったジャンル)を検証・パースする(仕様:
// design.md「バリデーション」)。省略可(この機能より前に公開した記事は持たないため、
// requirements.md#継続度・注目度の表示-17)。省略時は全ジャンル網羅の検証を行わない
function parseUnavailableGenres(raw: unknown, edition: Edition, topicGenres: Set<Genre>): Genre[] | undefined {
  if (raw === undefined) return undefined
  if (!Array.isArray(raw)) throw new Error('unavailableGenresは配列である必要があります')

  const seen = new Set<Genre>()
  for (const value of raw) {
    if (typeof value !== 'string' || !ALL_GENRES.includes(value as Genre)) {
      throw new Error(`unavailableGenresに未定義のジャンルが含まれています: ${String(value)}`)
    }
    const genre = value as Genre
    if (!GENRE_ORDER[edition].includes(genre)) {
      throw new Error(`unavailableGenres(${genre})はedition(${edition})に対応するジャンルに含まれていません`)
    }
    if (seen.has(genre)) {
      throw new Error(`unavailableGenresにジャンル(${genre})が重複しています`)
    }
    seen.add(genre)
    if (topicGenres.has(genre)) {
      throw new Error(`unavailableGenres(${genre})がtopicsのジャンルと重複しています`)
    }
  }

  return raw as Genre[]
}

// 記事データ(JSON)を検証・パースする。違反時は例外を投げる(next buildを失敗させる想定)。
// filenameは拡張子有無を問わず受け取り、idとの一致確認に使う
export function parseArticle(raw: unknown, filename: string): Article {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${filename}: 記事データがオブジェクトではありません`)
  }
  const data = raw as Record<string, unknown>

  if (typeof data.edition !== 'string' || !EDITIONS.includes(data.edition as Edition)) {
    throw new Error(`${filename}: editionが不正です(entertainmentまたはculture-lifestyleである必要があります): ${String(data.edition)}`)
  }
  const edition = data.edition as Edition

  if (typeof data.date !== 'string' || !DATE_FORMAT.test(data.date)) {
    throw new Error(`${filename}: dateがYYYY-MM-DD形式ではありません: ${String(data.date)}`)
  }

  if (!isNonEmptyString(data.id)) throw new Error(`${filename}: idが空文字です`)
  const expectedId = `${data.date}-${edition}`
  if (data.id !== expectedId) {
    throw new Error(`${filename}: idが<date>-<edition>形式と一致しません(id: ${data.id}, 期待値: ${expectedId})`)
  }

  const expectedFilename = `${data.id}.json`
  if (filename !== expectedFilename && filename !== data.id) {
    throw new Error(`${filename}: idとファイル名が一致しません(id: ${data.id})`)
  }

  const maxTopics = GENRE_ORDER[edition].length
  if (!Array.isArray(data.topics) || data.topics.length < 1 || data.topics.length > maxTopics) {
    throw new Error(
      `${filename}: topicsは1件以上${maxTopics}件以下である必要があります(実際: ${Array.isArray(data.topics) ? data.topics.length : '配列以外'}件)`
    )
  }

  const topics = data.topics.map((topic, index) => parseTopic(topic, index, edition, data.date as string))

  const ids = topics.map((topic) => topic.id)
  const uniqueIds = new Set(ids)
  if (uniqueIds.size !== ids.length) {
    throw new Error(`${filename}: topics内でidが重複しています`)
  }

  const countByGenre = new Map<Genre, number>()
  for (const topic of topics) {
    countByGenre.set(topic.genre, (countByGenre.get(topic.genre) ?? 0) + 1)
  }
  for (const [genre, count] of countByGenre) {
    if (count > MAX_TOPICS_PER_GENRE) {
      throw new Error(`${filename}: ジャンル(${genre})のトピックが${MAX_TOPICS_PER_GENRE}件を超えています(実際: ${count}件)`)
    }
  }

  const topicGenres = new Set(topics.map((topic) => topic.genre))
  const unavailableGenres = parseUnavailableGenres(data.unavailableGenres, edition, topicGenres)

  // unavailableGenresを持つ記事(この機能以降に公開した記事)は、topics+unavailableGenresが
  // その編の全ジャンルと過不足なく一致することを検証する(requirements.md#継続度・注目度の表示-17)。
  // 持たない記事(過去の記事)は網羅の検証をしない
  if (unavailableGenres !== undefined) {
    const covered = new Set([...topicGenres, ...unavailableGenres])
    const missing = GENRE_ORDER[edition].filter((genre) => !covered.has(genre))
    if (missing.length > 0) {
      throw new Error(`${filename}: topics・unavailableGenresのどちらにも含まれないジャンルがあります: ${missing.join(', ')}`)
    }
  }

  return {
    id: data.id,
    edition,
    date: data.date,
    topics,
    ...(unavailableGenres !== undefined ? { unavailableGenres } : {}),
  }
}
