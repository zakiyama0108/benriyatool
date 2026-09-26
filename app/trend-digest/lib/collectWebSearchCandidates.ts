import type { Candidate } from './candidateTypes'
import type { WatchlistEntry, WebSearchGenreCriteria } from './watchlistTypes'

// WebSearchジャンルの候補収集・判定(仕様: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1〜6、
// design.md「WebSearchジャンルの候補を収集・判定する処理(エージェントの推論)」)。
// Claude Code CLIのヘッドレス起動そのもの(execFile)はscripts/trend-digest/collect-websearch-candidates.tsが担い、
// 本モジュールは「CLIの応答をどう分類し、独立情報源数の基準をどう適用するか」という決定的ロジックのみを持つ
// (ai-dev-digest content-generationのgenerateContent.tsと同じ考え方。CLI呼び出しを注入できる形にしてテストする)

// Claude Code CLI(`claude -p ... --output-format json`)の応答のうち、分類に使うフィールドのみを型にする
export type ClaudeCliResponse = {
  result?: string
  is_error?: boolean
}

type RawWebSearchTopic = {
  title?: unknown
  sourceName?: unknown
  sourceUrl?: unknown
  independentSourceCount?: unknown
}

export type WebSearchTopic = {
  title: string
  sourceName: string
  sourceUrl: string
  independentSourceCount: number
}

export type ClassifiedWebSearchResult =
  | { kind: 'ok'; topics: WebSearchTopic[] }
  | { kind: 'failed'; detail: string }

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// 応答内の1要素が候補として使える形かを判定する(design.md手順3「話題の名称・代表的な出典1件・
// 独立情報源の言及数」が揃っているか)。欠けている・型が不正な要素は無視し、有効な要素のみ残す
function isUsableTopic(raw: RawWebSearchTopic): raw is Required<RawWebSearchTopic> & WebSearchTopic {
  if (typeof raw.title !== 'string' || raw.title.trim() === '') return false
  if (typeof raw.sourceName !== 'string' || raw.sourceName.trim() === '') return false
  if (!isHttpUrl(raw.sourceUrl)) return false
  if (typeof raw.independentSourceCount !== 'number' || !Number.isInteger(raw.independentSourceCount)) return false
  if (raw.independentSourceCount < 1) return false
  return true
}

// CLI応答を成功/失敗の2種に分類する(design.md手順4「応答は指定のJSON配列単体とし、
// 聞き返し・説明文のみの応答を返さない」)。検索・判定自体が失敗した場合はfailedとして扱い、
// 呼び出し元がそのジャンルを候補0件として他のジャンルの処理を続ける(design.md「エラーハンドリング」)
export function classifyWebSearchResult(res: ClaudeCliResponse): ClassifiedWebSearchResult {
  if (res.is_error) {
    return { kind: 'failed', detail: res.result ?? '(メッセージなし)' }
  }
  const text = res.result ?? ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) {
    return { kind: 'failed', detail: `応答からJSON配列を抽出できませんでした: ${text}` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return { kind: 'failed', detail: `応答のJSON配列をパースできませんでした: ${text}` }
  }
  if (!Array.isArray(parsed)) {
    return { kind: 'failed', detail: '応答がJSON配列ではありません' }
  }

  const topics: WebSearchTopic[] = []
  for (const item of parsed) {
    if (typeof item !== 'object' || item === null) continue
    const raw = item as RawWebSearchTopic
    if (isUsableTopic(raw)) {
      topics.push({
        title: raw.title,
        sourceName: raw.sourceName,
        sourceUrl: raw.sourceUrl,
        independentSourceCount: raw.independentSourceCount,
      })
    }
  }
  return { kind: 'ok', topics }
}

// 1ジャンル分の話題収集を行う関数。scripts側がClaude Code CLIのヘッドレス起動を注入する(テストではモックを渡す)
export type WebSearchCallFn = (entry: WatchlistEntry) => Promise<ClaudeCliResponse>

// 1ジャンル分のWebSearch候補を収集・判定する(design.md「WebSearchジャンルの候補を収集・判定する処理」手順1〜3)。
// 独立情報源数がminIndependentSources未満の話題は候補にしない(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1)
export async function collectWebSearchCandidates(
  entry: WatchlistEntry,
  criteria: WebSearchGenreCriteria,
  call: WebSearchCallFn
): Promise<{ candidates: Candidate[]; ok: boolean; detail?: string }> {
  const res = await call(entry)
  const classified = classifyWebSearchResult(res)

  if (classified.kind === 'failed') {
    // WebSearchジャンルの検索・判定自体が失敗・応答不能だった場合、そのジャンルは「候補0件」として扱い、
    // 他のジャンルの収集・選定を止めない(design.md「エラーハンドリング」)
    return { candidates: [], ok: false, detail: classified.detail }
  }

  const candidates: Candidate[] = classified.topics
    .filter((topic) => topic.independentSourceCount >= criteria.minIndependentSources)
    .map((topic) => ({
      genre: entry.genre,
      title: topic.title,
      sourceName: topic.sourceName,
      sourceUrl: topic.sourceUrl,
      method: 'websearch',
      strength: topic.independentSourceCount,
      note: `独立情報源${topic.independentSourceCount}件`,
    }))

  return { candidates, ok: true }
}
