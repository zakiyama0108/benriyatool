import type { Article, Edition, EmptySlot, Genre, Horizon, Impact, Prediction } from './types'
import { horizonsForIssue, IMPACT_ORDER } from './types'
import { EDITION_GENRES } from './genres'
import { isValidBodyLength } from './bodyValidation'

// 記事データ(JSONファイル)のスキーマ検証(仕様: design.md「バリデーション」)。
// 週次記事PRのCIをここで壊すことで、不正な記事データが公開されるのを防ぐ
// (article-detail/design.md#エラーハンドリング)

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const EMPTY_SLOT_REASONS: EmptySlot['reason'][] = ['no-candidate', 'collection-failed', 'generation-failed']
const COLLECTION_FAILURE_REASONS: string[] = ['timeout', 'invalid-format', 'other']
const EDITIONS: Edition[] = ['science-tech', 'life-society']

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

// predictions[index]1件を検証・パースする。horizonsはその回の時間軸2区分、genreIdsは
// 記事のedition(対象編)に属する5ジャンルのID一覧(廃止済みを含む。EDITION_GENRES[edition])
function parsePrediction(
  raw: unknown,
  index: number,
  horizons: Horizon[],
  genreIds: Genre[]
): Prediction {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`predictions[${index}]がオブジェクトではありません`)
  }
  const p = raw as Record<string, unknown>

  if (typeof p.genre !== 'string' || !genreIds.includes(p.genre)) {
    throw new Error(`predictions[${index}].genreが記事のedition(対象編)に属するジャンルに含まれていません: ${String(p.genre)}`)
  }
  const genre = p.genre

  if (!horizons.includes(p.horizon as Horizon)) {
    throw new Error(`predictions[${index}].horizonがその回の時間軸2区分に含まれていません: ${String(p.horizon)}`)
  }
  const horizon = p.horizon as Horizon

  const expectedId = `${genre}--${horizon}`
  if (p.id !== expectedId) {
    throw new Error(`predictions[${index}].idが<genre>--<horizon>と一致しません(id: ${String(p.id)}, 期待値: ${expectedId})`)
  }

  if (!isNonEmptyString(p.heading)) throw new Error(`predictions[${index}].headingが空文字です`)
  if (!isNonEmptyString(p.body)) throw new Error(`predictions[${index}].bodyが空文字です`)
  if (!isValidBodyLength(p.body)) {
    throw new Error(`predictions[${index}].bodyの文字数が不正です(160〜480字である必要があります): ${(p.body).length}字`)
  }

  if (!IMPACT_ORDER.includes(p.impact as Impact)) {
    throw new Error(`predictions[${index}].impactが定義済みの値ではありません: ${String(p.impact)}`)
  }

  if (!isNonEmptyString(p.impactReason)) throw new Error(`predictions[${index}].impactReasonが空文字です`)
  if (!isNonEmptyString(p.targetPeriod)) throw new Error(`predictions[${index}].targetPeriodが空文字です`)
  if (!isNonEmptyString(p.sourceTitle)) throw new Error(`predictions[${index}].sourceTitleが空文字です`)
  if (!isNonEmptyString(p.sourceName)) throw new Error(`predictions[${index}].sourceNameが空文字です`)
  if (!isHttpUrl(p.sourceUrl)) {
    throw new Error(`predictions[${index}].sourceUrlがhttp/https形式の絶対URLではありません: ${String(p.sourceUrl)}`)
  }

  return {
    id: expectedId,
    genre,
    horizon,
    heading: p.heading,
    body: p.body,
    impact: p.impact as Impact,
    impactReason: p.impactReason,
    targetPeriod: p.targetPeriod,
    sourceTitle: p.sourceTitle,
    sourceName: p.sourceName,
    sourceUrl: p.sourceUrl,
  }
}

// emptySlots[index]1件を検証・パースする
function parseEmptySlot(raw: unknown, index: number, horizons: Horizon[], genreIds: Genre[]): EmptySlot {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`emptySlots[${index}]がオブジェクトではありません`)
  }
  const s = raw as Record<string, unknown>

  if (typeof s.genre !== 'string' || !genreIds.includes(s.genre)) {
    throw new Error(`emptySlots[${index}].genreが記事のedition(対象編)に属するジャンルに含まれていません: ${String(s.genre)}`)
  }
  if (!horizons.includes(s.horizon as Horizon)) {
    throw new Error(`emptySlots[${index}].horizonがその回の時間軸2区分に含まれていません: ${String(s.horizon)}`)
  }
  if (!EMPTY_SLOT_REASONS.includes(s.reason as EmptySlot['reason'])) {
    throw new Error(`emptySlots[${index}].reasonが定義済みの値ではありません: ${String(s.reason)}`)
  }
  const reason = s.reason as EmptySlot['reason']

  if (reason === 'collection-failed') {
    if (typeof s.collectionFailureReason !== 'string' || !COLLECTION_FAILURE_REASONS.includes(s.collectionFailureReason)) {
      throw new Error(
        `emptySlots[${index}].collectionFailureReasonが不正です(reasonがcollection-failedの場合は必須): ${String(s.collectionFailureReason)}`
      )
    }
  } else if (s.collectionFailureReason !== undefined) {
    throw new Error(`emptySlots[${index}].collectionFailureReasonはreasonがcollection-failedの場合のみ指定できます`)
  }

  return {
    genre: s.genre,
    horizon: s.horizon as Horizon,
    reason,
    ...(reason === 'collection-failed'
      ? { collectionFailureReason: s.collectionFailureReason as EmptySlot['collectionFailureReason'] }
      : {}),
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
    throw new Error(`${filename}: editionが不正です(science-techまたはlife-societyである必要があります): ${String(data.edition)}`)
  }
  const edition = data.edition as Edition

  if (!isNonEmptyString(data.date) || !DATE_FORMAT.test(data.date)) {
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

  if (typeof data.issueNumber !== 'number' || !Number.isInteger(data.issueNumber) || data.issueNumber < 1) {
    throw new Error(`${filename}: issueNumberが1以上の整数ではありません: ${String(data.issueNumber)}`)
  }
  const issueNumber = data.issueNumber
  const horizons = horizonsForIssue(issueNumber)

  const genreIds = EDITION_GENRES[edition]

  if (!Array.isArray(data.predictions)) {
    throw new Error(`${filename}: predictionsは配列である必要があります`)
  }
  if (!Array.isArray(data.emptySlots)) {
    throw new Error(`${filename}: emptySlotsは配列である必要があります`)
  }

  const predictions = data.predictions.map((p, index) => parsePrediction(p, index, horizons, genreIds))
  const emptySlots = data.emptySlots.map((s, index) => parseEmptySlot(s, index, horizons, genreIds))

  // 同じ枠(ジャンル×時間軸)が2回現れないこと、記事に現れるジャンルはその回の2時間軸の
  // 両方が揃っていることを検証する(design.md「バリデーション」。枠が黙って消える事故を防ぐ)
  const slotKeys = [
    ...predictions.map((p) => `${p.genre}--${p.horizon}`),
    ...emptySlots.map((s) => `${s.genre}--${s.horizon}`),
  ]
  const uniqueSlotKeys = new Set(slotKeys)
  if (uniqueSlotKeys.size !== slotKeys.length) {
    throw new Error(`${filename}: 同じ枠(ジャンル×時間軸)が重複しています`)
  }

  const genresInArticle = new Set([...predictions.map((p) => p.genre), ...emptySlots.map((s) => s.genre)])
  for (const genre of genresInArticle) {
    for (const horizon of horizons) {
      if (!slotKeys.includes(`${genre}--${horizon}`)) {
        throw new Error(`${filename}: ジャンル(${genre})の時間軸(${horizon})の枠が欠けています`)
      }
    }
  }

  return { id: data.id, edition, date: data.date, issueNumber, predictions, emptySlots }
}
