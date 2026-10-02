import type { Article, EmptyGenre, Finding, Genre, Impact } from './types'
import { IMPACT_ORDER } from './types'
import { loadGenres } from './genres'
import { isValidBodyLength } from './bodyValidation'

// 記事データ(JSONファイル)のスキーマ検証(仕様: article-detail/design.md「バリデーション」)。
// 週次記事PRのCIをここで壊すことで、不正な記事データが公開されるのを防ぐ。
// content-selectionの過去記事読み込み(検証付き)が依存するため、article-detailに先立って置いている
// (ジャンルの追加・廃止で過去記事の検証が壊れないよう、検証は記事の中での整合に限る)

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const EMPTY_GENRE_REASONS: EmptyGenre['reason'][] = ['no-candidate', 'collection-failed', 'generation-failed']
const COLLECTION_FAILURE_REASONS: string[] = ['timeout', 'invalid-format', 'other']
const MIN_PUBLISHED_YEAR = 1900

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

function parseFinding(raw: unknown, index: number, genreIds: Genre[], issueYear: number): Finding {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`findings[${index}]がオブジェクトではありません`)
  }
  const f = raw as Record<string, unknown>

  if (typeof f.genre !== 'string' || !genreIds.includes(f.genre)) {
    throw new Error(`findings[${index}].genreがgenres.jsonに存在しません: ${String(f.genre)}`)
  }
  if (f.id !== f.genre) {
    throw new Error(`findings[${index}].idがgenreと一致しません(id: ${String(f.id)}, 期待値: ${f.genre})`)
  }
  if (!IMPACT_ORDER.includes(f.impact as Impact)) {
    throw new Error(`findings[${index}].impactが定義済みの値ではありません: ${String(f.impact)}`)
  }
  for (const key of ['heading', 'body', 'impactReason', 'sourceTitle', 'sourceName'] as const) {
    if (!isNonEmptyString(f[key])) throw new Error(`findings[${index}].${key}が空です`)
  }
  if (!isHttpUrl(f.sourceUrl)) {
    throw new Error(`findings[${index}].sourceUrlがhttp/https形式の絶対URLではありません: ${String(f.sourceUrl)}`)
  }
  if (f.doi !== null && (typeof f.doi !== 'string' || !f.doi.startsWith('10.'))) {
    throw new Error(`findings[${index}].doiがnullでも10.で始まる文字列でもありません: ${JSON.stringify(f.doi)}`)
  }
  if (
    f.publishedYear !== null &&
    (typeof f.publishedYear !== 'number' ||
      !Number.isInteger(f.publishedYear) ||
      f.publishedYear < MIN_PUBLISHED_YEAR ||
      f.publishedYear > issueYear)
  ) {
    throw new Error(`findings[${index}].publishedYearがnullでも${MIN_PUBLISHED_YEAR}以上${issueYear}以下の整数でもありません: ${JSON.stringify(f.publishedYear)}`)
  }
  if (typeof f.isPreprint !== 'boolean') {
    throw new Error(`findings[${index}].isPreprintが真偽値ではありません: ${String(f.isPreprint)}`)
  }
  if (!isValidBodyLength(f.body)) {
    throw new Error(`findings[${index}].bodyの文字数が不正です(160〜480字である必要があります): ${(f.body as string).length}字`)
  }

  return {
    id: f.genre,
    genre: f.genre,
    heading: f.heading as string,
    body: f.body as string,
    impact: f.impact as Impact,
    impactReason: f.impactReason as string,
    sourceTitle: f.sourceTitle as string,
    sourceName: f.sourceName as string,
    sourceUrl: f.sourceUrl,
    doi: f.doi,
    publishedYear: f.publishedYear,
    isPreprint: f.isPreprint,
  }
}

function parseEmptyGenre(raw: unknown, index: number, genreIds: Genre[]): EmptyGenre {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`emptyGenres[${index}]がオブジェクトではありません`)
  }
  const e = raw as Record<string, unknown>

  if (typeof e.genre !== 'string' || !genreIds.includes(e.genre)) {
    throw new Error(`emptyGenres[${index}].genreがgenres.jsonに存在しません: ${String(e.genre)}`)
  }
  if (!EMPTY_GENRE_REASONS.includes(e.reason as EmptyGenre['reason'])) {
    throw new Error(`emptyGenres[${index}].reasonが定義済みの値ではありません: ${String(e.reason)}`)
  }
  const reason = e.reason as EmptyGenre['reason']

  if (reason === 'collection-failed') {
    if (typeof e.collectionFailureReason !== 'string' || !COLLECTION_FAILURE_REASONS.includes(e.collectionFailureReason)) {
      throw new Error(
        `emptyGenres[${index}].collectionFailureReasonが不正です(reasonがcollection-failedの場合は必須): ${String(e.collectionFailureReason)}`,
      )
    }
    return { genre: e.genre, reason, collectionFailureReason: e.collectionFailureReason as EmptyGenre['collectionFailureReason'] }
  }
  if (e.collectionFailureReason !== undefined) {
    throw new Error(`emptyGenres[${index}].collectionFailureReasonはreasonがcollection-failedの場合のみ指定できます`)
  }
  return { genre: e.genre, reason }
}

// 記事データ(JSON)を検証・パースする。違反時は例外を投げる(next buildを失敗させる想定)。
// filenameは拡張子有無を問わず受け取り、idとの一致確認に使う
export function parseArticle(raw: unknown, filename: string): Article {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${filename}: 記事データがオブジェクトではありません`)
  }
  const data = raw as Record<string, unknown>

  if (!isNonEmptyString(data.date) || !DATE_FORMAT.test(data.date)) {
    throw new Error(`${filename}: dateがYYYY-MM-DD形式ではありません: ${String(data.date)}`)
  }
  if (data.id !== data.date) {
    throw new Error(`${filename}: idがdateと一致しません(id: ${String(data.id)}, date: ${data.date})`)
  }
  if (filename !== `${data.id}.json` && filename !== data.id) {
    throw new Error(`${filename}: idとファイル名が一致しません(id: ${data.id})`)
  }
  if (!Array.isArray(data.findings)) throw new Error(`${filename}: findingsは配列である必要があります`)
  if (!Array.isArray(data.emptyGenres)) throw new Error(`${filename}: emptyGenresは配列である必要があります`)

  const genreIds = loadGenres().map((g) => g.id)
  const issueYear = Number(data.date.slice(0, 4))
  const findings = data.findings.map((f, i) => parseFinding(f, i, genreIds, issueYear))
  const emptyGenres = data.emptyGenres.map((e, i) => parseEmptyGenre(e, i, genreIds))

  // 研究と掲載できなかったジャンルを合わせて、同じジャンルが2回現れないこと(1ジャンル1本)。
  // 研究が0件でもよい(全ジャンルで採用できなかった回も公開する)
  const genres = [...findings.map((f) => f.genre), ...emptyGenres.map((e) => e.genre)]
  if (new Set(genres).size !== genres.length) {
    throw new Error(`${filename}: 同じジャンルが重複しています`)
  }

  return { id: data.id, date: data.date, findings, emptyGenres }
}
