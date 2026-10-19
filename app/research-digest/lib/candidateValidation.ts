import type { Impact } from './types'
import { IMPACT_ORDER } from './types'
import type { Candidate } from './candidateTypes'
import { normalizeDoi } from './deliveredIndex'

// Claudeが返した候補の検証(仕様: content-selection/design.md「バリデーション」)。
// 満たさない候補はその場で捨て、理由をログ用に返す(design.md「ジャンルごとに候補を集める処理」手順9)

const IMPACT_REASON_MAX_LENGTH = 200
const SOURCE_NAME_MAX_LENGTH = 200
const SOURCE_TITLE_MAX_LENGTH = 300
const MIN_PUBLISHED_YEAR = 1900
const CONTROL_CHAR_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== ''
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

export type ValidationRejection = { index: number; reason: string }

export type ValidateCandidatesResult = {
  candidates: Candidate[]
  rejected: ValidationRejection[]
}

// rawはCLIが受け取ったJSON応答の候補配列に、ジャンルidを補ったもの。todayは発表年の上限
// (実行日の年)を求めるために使う
export function validateCandidates(raw: unknown[], today: Date): ValidateCandidatesResult {
  const candidates: Candidate[] = []
  const rejected: ValidationRejection[] = []
  const currentYear = today.getFullYear()

  raw.forEach((item, index) => {
    const reject = (reason: string) => rejected.push({ index, reason })
    if (typeof item !== 'object' || item === null) {
      reject('候補がオブジェクトではありません')
      return
    }
    const c = item as Record<string, unknown>

    if (!IMPACT_ORDER.includes(c.impact as Impact)) {
      return reject(`impactが定義済みの値ではありません: ${String(c.impact)}`)
    }
    if (typeof c.impactRank !== 'number' || !Number.isInteger(c.impactRank) || c.impactRank < 1) {
      return reject(`impactRankが1以上の整数ではありません: ${String(c.impactRank)}`)
    }
    if (!isNonEmptyString(c.impactReason)) return reject('impactReasonが空です')
    if (!isNonEmptyString(c.sourceTitle)) return reject('sourceTitleが空です')
    if (!isNonEmptyString(c.sourceName)) return reject('sourceNameが空です')
    if (!isHttpUrl(c.sourceUrl)) {
      return reject(`sourceUrlがhttp/https絶対URLではありません: ${String(c.sourceUrl)}`)
    }

    // doiはnullまたは10.で始まる文字列。https://doi.org/付きで返ってきた場合は正規化してから確かめる
    let doi: string | null = null
    if (c.doi !== null && c.doi !== undefined) {
      if (typeof c.doi !== 'string') return reject(`doiが文字列でもnullでもありません: ${JSON.stringify(c.doi)}`)
      const normalized = normalizeDoi(c.doi)
      if (!normalized.startsWith('10.')) return reject(`doiが10.で始まっていません: ${c.doi}`)
      doi = normalized
    }

    let publishedYear: number | null = null
    if (c.publishedYear !== null && c.publishedYear !== undefined) {
      if (
        typeof c.publishedYear !== 'number' ||
        !Number.isInteger(c.publishedYear) ||
        c.publishedYear < MIN_PUBLISHED_YEAR ||
        c.publishedYear > currentYear
      ) {
        return reject(`publishedYearが${MIN_PUBLISHED_YEAR}以上${currentYear}以下の整数ではありません: ${JSON.stringify(c.publishedYear)}`)
      }
      publishedYear = c.publishedYear
    }

    if (typeof c.isPreprint !== 'boolean') {
      return reject(`isPreprintが真偽値ではありません: ${String(c.isPreprint)}`)
    }

    if (c.impactReason.length > IMPACT_REASON_MAX_LENGTH) {
      return reject(`impactReasonが${IMPACT_REASON_MAX_LENGTH}字を超えています`)
    }
    if (c.sourceName.length > SOURCE_NAME_MAX_LENGTH) {
      return reject(`sourceNameが${SOURCE_NAME_MAX_LENGTH}字を超えています`)
    }
    if (c.sourceTitle.length > SOURCE_TITLE_MAX_LENGTH) {
      return reject(`sourceTitleが${SOURCE_TITLE_MAX_LENGTH}字を超えています`)
    }
    if ([c.impactReason, c.sourceTitle, c.sourceName].some((v) => CONTROL_CHAR_PATTERN.test(v))) {
      return reject('制御文字を含む文字列があります')
    }

    candidates.push({
      genre: c.genre as string,
      impact: c.impact as Impact,
      impactRank: c.impactRank,
      impactReason: c.impactReason,
      sourceTitle: c.sourceTitle,
      sourceName: c.sourceName,
      sourceUrl: c.sourceUrl,
      doi,
      publishedYear,
      isPreprint: c.isPreprint,
    })
  })

  return { candidates, rejected }
}
