import type { Horizon, Impact } from './types'
import type { Candidate } from './candidateTypes'

// Claudeが返した候補の検証(仕様: content-selection/design.md「バリデーション」)。
// 満たさない候補はその場で捨て、理由をログ用に返す(design.md「ジャンルごとに候補を集める処理」手順7)

const IMPACT_VALUES: Impact[] = ['high', 'medium', 'low']
const IMPACT_REASON_MAX_LENGTH = 200
const SOURCE_NAME_MAX_LENGTH = 200
const SOURCE_TITLE_MAX_LENGTH = 300
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

function hasNoControlChars(value: string): boolean {
  return !CONTROL_CHAR_PATTERN.test(value)
}

export type ValidationRejection = { index: number; reason: string }

export type ValidateCandidatesResult = {
  candidates: Candidate[]
  rejected: ValidationRejection[]
}

// rawはCLIが受け取ったJSON応答を、ジャンル・horizonを補って1件ずつのオブジェクト配列に
// 平坦化したもの(design.md「ジャンルごとに候補を集める処理」手順6の応答形式を参照)
export function validateCandidates(raw: unknown[], horizons: Horizon[]): ValidateCandidatesResult {
  const candidates: Candidate[] = []
  const rejected: ValidationRejection[] = []

  raw.forEach((item, index) => {
    const c = item as Partial<Candidate>

    if (!horizons.includes(c.horizon as Horizon)) {
      rejected.push({ index, reason: `horizonが今回の時間軸2区分に含まれていません: ${String(c.horizon)}` })
      return
    }
    if (!IMPACT_VALUES.includes(c.impact as Impact)) {
      rejected.push({ index, reason: `impactが定義済みの値ではありません: ${String(c.impact)}` })
      return
    }
    if (typeof c.impactRank !== 'number' || !Number.isInteger(c.impactRank) || c.impactRank < 1) {
      rejected.push({ index, reason: `impactRankが1以上の整数ではありません: ${String(c.impactRank)}` })
      return
    }
    if (!isNonEmptyString(c.impactReason)) {
      rejected.push({ index, reason: 'impactReasonが空です' })
      return
    }
    if (!isNonEmptyString(c.targetPeriod)) {
      rejected.push({ index, reason: 'targetPeriodが空です' })
      return
    }
    if (!isNonEmptyString(c.sourceTitle)) {
      rejected.push({ index, reason: 'sourceTitleが空です' })
      return
    }
    if (!isNonEmptyString(c.sourceName)) {
      rejected.push({ index, reason: 'sourceNameが空です' })
      return
    }
    if (!isHttpUrl(c.sourceUrl)) {
      rejected.push({ index, reason: `sourceUrlがhttp/https絶対URLではありません: ${String(c.sourceUrl)}` })
      return
    }
    if (c.impactReason.length > IMPACT_REASON_MAX_LENGTH) {
      rejected.push({ index, reason: `impactReasonが${IMPACT_REASON_MAX_LENGTH}字を超えています` })
      return
    }
    if (c.sourceName.length > SOURCE_NAME_MAX_LENGTH) {
      rejected.push({ index, reason: `sourceNameが${SOURCE_NAME_MAX_LENGTH}字を超えています` })
      return
    }
    if (c.sourceTitle.length > SOURCE_TITLE_MAX_LENGTH) {
      rejected.push({ index, reason: `sourceTitleが${SOURCE_TITLE_MAX_LENGTH}字を超えています` })
      return
    }
    const textFields = [c.impactReason, c.targetPeriod, c.sourceTitle, c.sourceName]
    if (textFields.some((value) => !hasNoControlChars(value))) {
      rejected.push({ index, reason: '制御文字を含む文字列があります' })
      return
    }

    candidates.push({
      genre: c.genre as string,
      horizon: c.horizon as Horizon,
      impact: c.impact as Impact,
      impactRank: c.impactRank,
      impactReason: c.impactReason,
      targetPeriod: c.targetPeriod,
      sourceTitle: c.sourceTitle,
      sourceName: c.sourceName,
      sourceUrl: c.sourceUrl,
      publishedAt: typeof c.publishedAt === 'string' ? c.publishedAt : null,
    })
  })

  return { candidates, rejected }
}
