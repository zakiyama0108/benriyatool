import type { Article, Edition, Genre, Topic } from './types'
import { GENRE_ORDER } from './types'
import { BODY_MIN_LENGTH, BODY_MAX_LENGTH, isValidTopicBodyLength } from './bodyValidation'

// 記事データ(JSONファイル)のスキーマ検証(仕様: design.md「バリデーション」)。
// エージェントが生成する入力の事故を早期に検知するため、ビルド時にここで例外を投げて
// next buildを失敗させる(article-detail/design.md#エラーハンドリング)。
// 本文の分量検証はcontent-generationがオーナーのbodyValidation.tsに委ねる(重複実装しない)

const EDITIONS: Edition[] = ['entertainment', 'culture-lifestyle']
const ALL_GENRES: Genre[] = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const MAX_TOPICS = 10
const MAX_TOPICS_PER_GENRE = 2

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

// topics[index]1件を検証・パースする(仕様: article-detail/design.md「バリデーション」)。
// editionはジャンルが対象9ジャンルに属するかの照合に使う
function parseTopic(raw: unknown, index: number, edition: Edition): Topic {
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
      `topics[${index}].genre(${genre})はedition(${edition})に対応する9ジャンルに含まれていません`
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

  return {
    id: topic.id,
    genre,
    heading: topic.heading,
    body: topic.body,
    sourceTitle: topic.sourceTitle,
    sourceName: topic.sourceName,
    sourceUrl: topic.sourceUrl,
  }
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

  if (!Array.isArray(data.topics) || data.topics.length < 1 || data.topics.length > MAX_TOPICS) {
    throw new Error(
      `${filename}: topicsは1件以上${MAX_TOPICS}件以下である必要があります(実際: ${Array.isArray(data.topics) ? data.topics.length : '配列以外'}件)`
    )
  }

  const topics = data.topics.map((topic, index) => parseTopic(topic, index, edition))

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

  return { id: data.id, edition, date: data.date, topics }
}
