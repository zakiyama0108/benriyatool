import type { Article, CurrentFinding, Diagram, Edition, EmptyGenre, Finding, FindingSection, FindingSections, Genre, Impact, LegacyFinding } from './types'
import { IMPACT_ORDER } from './types'
import { EDITION_GENRES } from './genres'
import { isValidBodyLength, isValidSectionsLength } from './bodyValidation'

// 記事データ(JSONファイル)のスキーマ検証(仕様: article-detail/design.md「バリデーション」)。
// 週次記事PRのCIをここで壊すことで、不正な記事データが公開されるのを防ぐ。
// content-selectionの過去記事読み込み(検証付き)が依存するため、article-detailに先立って置いている
// (ジャンルの追加・廃止で過去記事の検証が壊れないよう、検証は記事の中での整合に限る)

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/
const EMPTY_GENRE_REASONS: EmptyGenre['reason'][] = ['no-candidate', 'collection-failed', 'generation-failed']
const COLLECTION_FAILURE_REASONS: string[] = ['timeout', 'invalid-format', 'other']
const MIN_PUBLISHED_YEAR = 1900
const EDITIONS: Edition[] = ['body-life', 'science-society']
const SECTION_KEYS = ['finding', 'basis', 'relevance', 'caveat'] as const

// 図解の生成画像が配信されるURLパス(content-generation/design.md「見出し・固定4観点を書く処理」
// 手順13)。public/配下に保存され、diagram.pathはこの配下を指すURLパス(先頭スラッシュ)である必要が
// ある(news-digestのarticleSchema.tsと同じ考え方。2026-10改定: content/配下はビルド時にfsで
// 読み込むだけで配信対象ではなく<img src>で404になるため、public/配下に変更した)
const DIAGRAM_IMAGES_DIR = '/content/research-digest/articles/images/'

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

// findings[index].sections.<key>.diagram(観点ごとの図解)を検証・パースする(仕様:
// content-generation/requirements.md#図解-6、article-detail/design.md「バリデーション」)。
// null、または{type:'mermaid', code: 空文字でない}、または{type:'image', path: DIAGRAM_IMAGES_DIR配下}
// のいずれかであることを確認する。CurrentFindingは常にdiagramキーを持つため、undefinedは許容しない
// (キー自体がない過去記事はbodyを持つLegacyFindingとして別経路で検証する)
function parseDiagram(raw: unknown, index: number, key: string): Diagram | null {
  if (raw === null) return null
  if (typeof raw !== 'object') {
    throw new Error(`findings[${index}].sections.${key}.diagramがオブジェクトでもnullでもありません`)
  }
  const record = raw as Record<string, unknown>
  if (record.type === 'mermaid') {
    if (!isNonEmptyString(record.code)) {
      throw new Error(`findings[${index}].sections.${key}.diagram.codeが空文字です`)
    }
    return { type: 'mermaid', code: record.code }
  }
  if (record.type === 'image') {
    if (!isNonEmptyString(record.path) || !record.path.startsWith(DIAGRAM_IMAGES_DIR)) {
      throw new Error(
        `findings[${index}].sections.${key}.diagram.pathが${DIAGRAM_IMAGES_DIR}配下のパスではありません: ${String(record.path)}`,
      )
    }
    return { type: 'image', path: record.path }
  }
  throw new Error(`findings[${index}].sections.${key}.diagram.typeが不正です(mermaid/imageのみ許可): ${String(record.type)}`)
}

// findings[index].sections.<key>(固定4観点1つ分)を検証・パースする
function parseSection(raw: unknown, index: number, key: string): FindingSection {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`findings[${index}].sections.${key}がオブジェクトではありません`)
  }
  const record = raw as Record<string, unknown>
  if (!isNonEmptyString(record.heading)) throw new Error(`findings[${index}].sections.${key}.headingが空文字です`)
  if (!isNonEmptyString(record.text)) throw new Error(`findings[${index}].sections.${key}.textが空文字です`)
  return { heading: record.heading, text: record.text, diagram: parseDiagram(record.diagram, index, key) }
}

// findings[index].sections(固定4観点)を検証・パースする。4キーの存在・各観点のheading/textの非空・
// 4観点のtext合計の分量はisValidSectionsLengthで判定する(仕様: content-generation/design.md
// 「生成結果を検証する処理」、article-detail/design.md「バリデーション」)
function parseSections(raw: unknown, index: number): FindingSections {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`findings[${index}].sectionsがオブジェクトではありません`)
  }
  const record = raw as Record<string, unknown>
  const sections: FindingSections = {
    finding: parseSection(record.finding, index, 'finding'),
    basis: parseSection(record.basis, index, 'basis'),
    relevance: parseSection(record.relevance, index, 'relevance'),
    caveat: parseSection(record.caveat, index, 'caveat'),
  }
  if (!isValidSectionsLength(sections)) {
    const totalLength = SECTION_KEYS.reduce((sum, key) => sum + sections[key].text.length, 0)
    throw new Error(
      `findings[${index}].sectionsのtext合計文字数が不正です(160〜480字である必要があります): ${totalLength}字`,
    )
  }
  return sections
}

function parseFinding(raw: unknown, index: number, genreIds: Genre[], issueYear: number): Finding {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`findings[${index}]がオブジェクトではありません`)
  }
  const f = raw as Record<string, unknown>

  if (typeof f.genre !== 'string' || !genreIds.includes(f.genre)) {
    throw new Error(`findings[${index}].genreが記事のedition(対象編)に属するジャンルに含まれていません: ${String(f.genre)}`)
  }
  if (f.id !== f.genre) {
    throw new Error(`findings[${index}].idがgenreと一致しません(id: ${String(f.id)}, 期待値: ${f.genre})`)
  }
  if (!IMPACT_ORDER.includes(f.impact as Impact)) {
    throw new Error(`findings[${index}].impactが定義済みの値ではありません: ${String(f.impact)}`)
  }
  for (const key of ['heading', 'impactReason', 'sourceTitle', 'sourceName'] as const) {
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

  // body(LegacyFinding)またはsections(CurrentFinding)のどちらか一方のみを持つこと(仕様:
  // article-detail/design.md「前提: 記事データの形式」isLegacyFindingの判定と対になる制約。
  // ai-dev-digestのhasSections/hasSummaryの排他判定と同じ考え方)
  const hasBody = f.body !== undefined
  const hasSections = f.sections !== undefined
  if (hasBody === hasSections) {
    throw new Error(`findings[${index}]はbody(旧形式)またはsections(新形式)のどちらか一方のみを持つ必要があります`)
  }

  const base = {
    id: f.genre,
    genre: f.genre,
    heading: f.heading as string,
    impact: f.impact as Impact,
    impactReason: f.impactReason as string,
    sourceTitle: f.sourceTitle as string,
    sourceName: f.sourceName as string,
    sourceUrl: f.sourceUrl,
    doi: f.doi,
    publishedYear: f.publishedYear,
    isPreprint: f.isPreprint,
  }

  if (hasBody) {
    if (!isValidBodyLength(f.body)) {
      throw new Error(`findings[${index}].bodyの文字数が不正です(160〜480字である必要があります): ${(f.body as string).length}字`)
    }
    const result: LegacyFinding = { ...base, body: f.body as string }
    return result
  }

  const result: CurrentFinding = { ...base, sections: parseSections(f.sections, index) }
  return result
}

function parseEmptyGenre(raw: unknown, index: number, genreIds: Genre[]): EmptyGenre {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`emptyGenres[${index}]がオブジェクトではありません`)
  }
  const e = raw as Record<string, unknown>

  if (typeof e.genre !== 'string' || !genreIds.includes(e.genre)) {
    throw new Error(`emptyGenres[${index}].genreが記事のedition(対象編)に属するジャンルに含まれていません: ${String(e.genre)}`)
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

  if (typeof data.edition !== 'string' || !EDITIONS.includes(data.edition as Edition)) {
    throw new Error(`${filename}: editionが不正です(body-lifeまたはscience-societyである必要があります): ${String(data.edition)}`)
  }
  const edition = data.edition as Edition

  if (!isNonEmptyString(data.date) || !DATE_FORMAT.test(data.date)) {
    throw new Error(`${filename}: dateがYYYY-MM-DD形式ではありません: ${String(data.date)}`)
  }
  const expectedId = `${data.date}-${edition}`
  if (data.id !== expectedId) {
    throw new Error(`${filename}: idが<date>-<edition>形式と一致しません(id: ${String(data.id)}, 期待値: ${expectedId})`)
  }
  if (filename !== `${data.id}.json` && filename !== data.id) {
    throw new Error(`${filename}: idとファイル名が一致しません(id: ${data.id})`)
  }
  if (!Array.isArray(data.findings)) throw new Error(`${filename}: findingsは配列である必要があります`)
  if (!Array.isArray(data.emptyGenres)) throw new Error(`${filename}: emptyGenresは配列である必要があります`)

  const genreIds = EDITION_GENRES[edition]
  const issueYear = Number(data.date.slice(0, 4))
  const findings = data.findings.map((f, i) => parseFinding(f, i, genreIds, issueYear))
  const emptyGenres = data.emptyGenres.map((e, i) => parseEmptyGenre(e, i, genreIds))

  // 研究と掲載できなかったジャンルを合わせて、同じジャンルが2回現れないこと(1ジャンル1本)。
  // 研究が0件でもよい(全ジャンルで採用できなかった回も公開する)
  const genres = [...findings.map((f) => f.genre), ...emptyGenres.map((e) => e.genre)]
  if (new Set(genres).size !== genres.length) {
    throw new Error(`${filename}: 同じジャンルが重複しています`)
  }

  return { id: data.id, edition, date: data.date, findings, emptyGenres }
}
