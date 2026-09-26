import type { Candidate, JudgedCandidate } from './candidateTypes'
import type { CategoryId } from './watchlistTypes'
import { normalizeUrl } from './selection'

// エージェント(Claude Code CLIのヘッドレス実行)応答のJSONパース・不正応答時のフォールバック
// (仕様: design.md「候補をグループ化し採用基準を判定する処理(エージェントの推論)」手順4〜5)。
// プロンプト組み立て・CLI起動そのものはscripts/news-digest/collect-and-select.tsが担い、
// 本モジュールは「応答テキストをどう解釈するか」という決定的ロジックのみを持つ
// (design.md「関連するファイル(抜粋)」参照。CLI呼び出しを注入できる形にしてvitestでテストする)

// design.md手順4が定めるエージェント応答1件分の形式
export type AgentJudgedItem = {
  heading: string
  category: CategoryId
  sourceName: string
  sourceUrl: string
  sourcePublishedAt: string
  meetsCriteria: boolean
  corroboratingSources: string[]
}

const CATEGORY_IDS: CategoryId[] = ['general', 'business', 'kanagawa', 'childcare']

function isAgentJudgedItem(value: unknown): value is AgentJudgedItem {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.heading === 'string' &&
    v.heading.trim() !== '' &&
    typeof v.category === 'string' &&
    CATEGORY_IDS.includes(v.category as CategoryId) &&
    typeof v.sourceName === 'string' &&
    v.sourceName.trim() !== '' &&
    typeof v.sourceUrl === 'string' &&
    v.sourceUrl.trim() !== '' &&
    typeof v.sourcePublishedAt === 'string' &&
    v.sourcePublishedAt.trim() !== '' &&
    typeof v.meetsCriteria === 'boolean' &&
    Array.isArray(v.corroboratingSources) &&
    v.corroboratingSources.every((s) => typeof s === 'string')
  )
}

// エージェント応答テキストから指定JSON形式(候補の配列)を抽出・検証する。
// 応答からJSON配列を抽出できない、パースできない、配列でない、いずれかの場合は空配列を返す
// (design.md「エラーハンドリング」: 指定のJSON形式で応答しなかった場合、そのカテゴリの判定を
// 「候補なし」として扱い、他のカテゴリの処理は継続する。例外を投げない)
export function parseAgentJudgment(responseText: string): AgentJudgedItem[] {
  const match = responseText.match(/\[[\s\S]*\]/)
  if (!match) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed.filter(isAgentJudgedItem)
}

// エージェントが判定した項目を、実際に収集したCandidate一覧と元URL(正規化して突き合わせ)で
// 照合し、JudgedCandidateへ変換する。元URLが収集した候補の中に存在しない項目は、
// エージェントが収集していない情報源の話題を創作した可能性があるため除外する
// (requirements.md#情報源(固定リスト)-2の固定リスト運用を、エージェントの応答に対しても徹底する)
export function toJudgedCandidates(items: AgentJudgedItem[], collectedCandidates: Candidate[]): JudgedCandidate[] {
  const byUrl = new Map(collectedCandidates.map((c) => [normalizeUrl(c.url), c]))

  const judged: JudgedCandidate[] = []
  for (const item of items) {
    const original = byUrl.get(normalizeUrl(item.sourceUrl))
    if (!original) continue
    judged.push({ ...original, meetsCriteria: item.meetsCriteria, corroboratingSources: item.corroboratingSources })
  }
  return judged
}
