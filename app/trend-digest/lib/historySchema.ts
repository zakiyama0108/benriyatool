import fs from 'node:fs'
import path from 'node:path'
import type { Edition, Genre } from './types'
import { GENRE_ORDER } from './types'
import type { Observation, ObservationLog } from './historyTypes'
import { normalizeTitle } from './selection'

// 観測ログ(content/trend-digest/history/<date>-<edition>.json)のスキーマ検証・パース
// (仕様: design.md「バリデーション」)。エージェント・情報源に由来する外部入力であり、
// 想定外の長さ・制御文字がそのまま記事データへ転記されることを防ぐため、記事スキーマ
// (articleSchema.ts)と同じ考え方で検証する。履歴は以後すべてのラベル判定の土台になる
// データのため、違反時は例外を投げて週次実行を失敗させる(design.md「エラーハンドリング」)

const EDITIONS: Edition[] = ['entertainment', 'culture-lifestyle']
const ALL_GENRES: Genre[] = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]
const METHODS = ['fixed-list', 'websearch'] as const
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const TITLE_MAX_LENGTH = 200
const REGION_MAX_LENGTH = 50
const MAX_REGIONS = 10
const CONTROL_CHAR = /[\x00-\x1F\x7F]/

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

// 地域名として妥当な文字列か(空文字でなく50文字以内・制御文字を含まない。articleSchema.tsと同じ上限)
function isValidRegionString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= REGION_MAX_LENGTH && !CONTROL_CHAR.test(value)
}

function parseOriginRegion(raw: unknown, index: number): string | null {
  if (raw === null) return null
  if (!isValidRegionString(raw)) {
    throw new Error(`observations[${index}].originRegionが不正です(nullまたは1〜${REGION_MAX_LENGTH}文字の制御文字を含まない文字列): ${JSON.stringify(raw)}`)
  }
  return raw
}

function parseCurrentRegions(raw: unknown, index: number): string[] {
  if (!Array.isArray(raw) || raw.length > MAX_REGIONS) {
    throw new Error(`observations[${index}].currentRegionsは${MAX_REGIONS}件以内の配列である必要があります: ${JSON.stringify(raw)}`)
  }
  for (const region of raw) {
    if (!isValidRegionString(region)) {
      throw new Error(`observations[${index}].currentRegionsの要素が不正です(1〜${REGION_MAX_LENGTH}文字の制御文字を含まない文字列): ${String(region)}`)
    }
  }
  return raw as string[]
}

function parseRegionStrength(raw: unknown, field: string, index: number): number | null {
  if (raw === null) return null
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) {
    throw new Error(`observations[${index}].${field}は0以上の数値またはnullである必要があります: ${JSON.stringify(raw)}`)
  }
  return raw
}

// observations[index]1件を検証・パースする(design.md「バリデーション」)
function parseObservation(raw: unknown, index: number, maxObservationsPerSource: number): Observation {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`observations[${index}]がオブジェクトではありません`)
  }
  const obs = raw as Record<string, unknown>

  if (typeof obs.genre !== 'string' || !ALL_GENRES.includes(obs.genre as Genre)) {
    throw new Error(`observations[${index}].genreが未定義のジャンルです: ${String(obs.genre)}`)
  }
  const genre = obs.genre as Genre

  if (!isNonEmptyString(obs.title) || obs.title.length > TITLE_MAX_LENGTH || CONTROL_CHAR.test(obs.title)) {
    throw new Error(`observations[${index}].titleが不正です(空文字でなく${TITLE_MAX_LENGTH}文字以内・制御文字を含まない必要があります): ${JSON.stringify(obs.title)}`)
  }

  if (typeof obs.strength !== 'number' || !Number.isFinite(obs.strength) || obs.strength < 0) {
    throw new Error(`observations[${index}].strengthは0以上の有限の数値である必要があります: ${String(obs.strength)}`)
  }

  if (obs.rank !== null) {
    if (
      typeof obs.rank !== 'number' ||
      !Number.isInteger(obs.rank) ||
      obs.rank < 1 ||
      obs.rank > maxObservationsPerSource
    ) {
      throw new Error(`observations[${index}].rankは1以上${maxObservationsPerSource}以下の整数またはnullである必要があります: ${JSON.stringify(obs.rank)}`)
    }
  }

  if (typeof obs.meetsCriteria !== 'boolean') {
    throw new Error(`observations[${index}].meetsCriteriaは真偽値である必要があります: ${String(obs.meetsCriteria)}`)
  }

  if (typeof obs.method !== 'string' || !METHODS.includes(obs.method as (typeof METHODS)[number])) {
    throw new Error(`observations[${index}].methodはfixed-listまたはwebsearchである必要があります: ${String(obs.method)}`)
  }

  const originRegion = parseOriginRegion(obs.originRegion, index)
  const currentRegions = parseCurrentRegions(obs.currentRegions, index)
  const strengthJapan = parseRegionStrength(obs.strengthJapan, 'strengthJapan', index)
  const strengthOverseas = parseRegionStrength(obs.strengthOverseas, 'strengthOverseas', index)

  return {
    genre,
    title: obs.title,
    strength: obs.strength,
    meetsCriteria: obs.meetsCriteria,
    rank: obs.rank,
    method: obs.method as Observation['method'],
    originRegion,
    currentRegions,
    strengthJapan,
    strengthOverseas,
  }
}

// 観測ログ(JSONファイルの中身)を検証・パースする。違反時は例外を投げる
// (週次実行を失敗させる想定。design.md「エラーハンドリング」)。
// filenameは拡張子有無を問わず受け取り、中身のdate/editionとの一致確認に使う
export function parseObservationLog(raw: unknown, filename: string, maxObservationsPerSource: number): ObservationLog {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${filename}: 観測ログがオブジェクトではありません`)
  }
  const data = raw as Record<string, unknown>

  if (typeof data.date !== 'string' || !DATE_FORMAT.test(data.date)) {
    throw new Error(`${filename}: dateがYYYY-MM-DD形式ではありません: ${String(data.date)}`)
  }
  if (typeof data.edition !== 'string' || !EDITIONS.includes(data.edition as Edition)) {
    throw new Error(`${filename}: editionが不正です(entertainmentまたはculture-lifestyleである必要があります): ${String(data.edition)}`)
  }
  const edition = data.edition as Edition

  const expectedFilename = `${data.date}-${edition}.json`
  const expectedId = `${data.date}-${edition}`
  if (filename !== expectedFilename && filename !== expectedId) {
    throw new Error(`${filename}: ファイル名と中身のdate/editionが一致しません(期待値: ${expectedFilename})`)
  }

  if (!Array.isArray(data.observations)) {
    throw new Error(`${filename}: observationsは配列である必要があります`)
  }

  const observations = data.observations.map((obs, index) => parseObservation(obs, index, maxObservationsPerSource))

  // 同じ正規化タイトルかつ同じ選定方式の観測が2件以上ないこと(design.md「バリデーション」。
  // 「その回の観測を履歴に記録する処理」手順3が方式ごとに1件へ寄せているため、
  // 同じ方式で2件以上あれば書き出し側の不具合)
  const seen = new Set<string>()
  for (const obs of observations) {
    const key = `${normalizeTitle(obs.title)}|${obs.method}`
    if (seen.has(key)) {
      throw new Error(`${filename}: 同じ正規化タイトル・選定方式の観測が重複しています: ${obs.title}(${obs.method})`)
    }
    seen.add(key)
  }

  return { date: data.date, edition, observations }
}

// content/trend-digest/history/配下の全観測ログを読み込む(仕様: design.md「履歴を話題ごとの
// 系列に集約する処理」手順1)。historyDirが存在しない・観測ログが1件もない運用開始直後は
// 例外にせず空配列を返す(design.md「エラーハンドリング」)。JSONとして読めないファイル・
// スキーマ違反のファイルがあった場合は例外を投げる
export function readObservationLogs(historyDir: string, maxObservationsPerSource: number): ObservationLog[] {
  if (!fs.existsSync(historyDir)) return []

  const filenames = fs.readdirSync(historyDir).filter((name) => name.endsWith('.json'))
  const logs = filenames.map((filename) => {
    const raw: unknown = JSON.parse(fs.readFileSync(path.join(historyDir, filename), 'utf8'))
    return parseObservationLog(raw, filename, maxObservationsPerSource)
  })

  return logs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}
