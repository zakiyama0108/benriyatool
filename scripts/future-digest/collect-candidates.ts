// ジャンルごとの収集CLI(仕様: content-selection/design.md「ジャンルごとに候補を集める処理」
// 「エラーハンドリング」)。Claude Code CLIのヘッドレス起動そのもの(execFile)は実行時のみ発生し、
// テストではcollectForGenreにcallを注入して「応答の分類・やり直し・分類ラベルへの変換」という
// 決定的ロジックだけを検証する(trend-digestのcollectWebSearchCandidates.tsと同じ考え方。tasks.md Task6)
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Horizon } from '../../app/future-digest/lib/types'
import type { Candidate, CollectionFailureReason } from '../../app/future-digest/lib/candidateTypes'
import { validateCandidates } from '../../app/future-digest/lib/candidateValidation'
import type { GenreConfig } from '../../app/future-digest/lib/genres'
import { loadGenres, getActiveGenres } from '../../app/future-digest/lib/genres'
import type { DeliveredIndex } from '../../app/future-digest/lib/deliveredIndex'

const execFileAsync = promisify(execFile)

// Claude Code CLI(`claude -p ... --output-format json`)の応答のうち、分類に使うフィールドのみを型にする
export type ClaudeCliResponse = {
  result?: string
  is_error?: boolean
  api_error_status?: number
}

// タイムアウト値を超えてClaude CLI呼び出しが中断されたことを表す(design.md「エラーハンドリング」timeout)
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

// 応答が利用上限への到達を示す場合に投げる例外(やり直さず、その時点で収集全体を打ち切る。
// content-selection/requirements.md#収集失敗-3)
export class QuotaExhaustedError extends Error {
  constructor(detail: string) {
    super(`利用上限への到達により収集を打ち切りました: ${detail}`)
    this.name = 'QuotaExhaustedError'
  }
}

export type CollectForGenreResult =
  | { status: 'ok'; candidates: Candidate[] }
  | { status: 'collection-failed'; reason: CollectionFailureReason }

// 1ジャンル分の収集を行う関数。scripts側がClaude Code CLIのヘッドレス起動を注入する(テストではモックを渡す)
export type CollectCallFn = (genre: GenreConfig, horizons: [Horizon, Horizon]) => Promise<ClaudeCliResponse>

// 利用枠の枯渇(週次/5時間ごとの上限到達)かどうか(generateContentの判定と同じ考え方)
function isQuotaExhausted(res: ClaudeCliResponse): boolean {
  if (res.api_error_status === 429) return true
  if (!res.is_error) return false
  const text = res.result ?? ''
  return /hit your (weekly|usage|5-hour) limit|usage limit reached|rate limit/i.test(text)
}

type Classified =
  | { kind: 'ok'; candidates: Candidate[] }
  | { kind: 'invalid-format'; detail: string }
  | { kind: 'quota'; detail: string }

// 応答が「時間軸ごとの候補配列」の形(例: { near: [...], long: [...] })を満たすかを確認する
function isUsableShape(parsed: unknown, horizons: [Horizon, Horizon]): parsed is Record<Horizon, unknown[]> {
  if (typeof parsed !== 'object' || parsed === null) return false
  const obj = parsed as Record<string, unknown>
  return horizons.every((h) => Array.isArray(obj[h]))
}

// CLI応答を成功/形式不正/利用枠枯渇の3種に分類する(design.md「ジャンルごとに候補を集める処理」手順6〜7)
function classifyResponse(res: ClaudeCliResponse, genre: GenreConfig, horizons: [Horizon, Horizon]): Classified {
  if (isQuotaExhausted(res)) {
    return { kind: 'quota', detail: res.result ?? '(メッセージなし)' }
  }
  if (res.is_error) {
    return { kind: 'invalid-format', detail: res.result ?? '(メッセージなし)' }
  }
  const text = res.result ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    return { kind: 'invalid-format', detail: `応答からJSONを抽出できませんでした: ${text}` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return { kind: 'invalid-format', detail: `応答のJSONをパースできませんでした: ${text}` }
  }
  if (!isUsableShape(parsed, horizons)) {
    return { kind: 'invalid-format', detail: '応答が時間軸ごとの候補配列の形式を満たしていません' }
  }

  // genre・horizonを補って1件ずつのオブジェクト配列に平坦化し、候補単位のバリデーションにかける
  // (design.md手順7。候補単位のバリデーションで全件捨てられても収集失敗にはしない)
  const raw: unknown[] = []
  for (const horizon of horizons) {
    for (const item of parsed[horizon]) {
      raw.push({ ...(item as Record<string, unknown>), genre: genre.id, horizon })
    }
  }
  const { candidates, rejected } = validateCandidates(raw, horizons)
  for (const r of rejected) {
    console.error(`${genre.label}: 候補[${r.index}]を検証で除外しました: ${r.reason}`)
  }
  return { kind: 'ok', candidates }
}

export type CollectForGenreOptions = {
  maxAttempts?: number // 1ジャンルあたりの最大試行回数(初回+リトライ)。design.mdの既定は2
}

// 1ジャンル分の候補を収集する(design.md「ジャンルごとに候補を集める処理」「エラーハンドリング」)。
// 応答からJSONを取り出せない・応答全体の形を満たさない・Claude CLIが異常終了した・タイムアウトを
// 超えた場合は、いずれも同じく最大2回まで(初回+1回)起動し直す。それでも失敗した場合はそのジャンルの
// 2枠をcollection-failedとして返す(候補なしとは区別する。requirements.md#収集失敗-1)。
// 利用上限への到達を示す応答は、やり直さずQuotaExhaustedErrorを投げてその時点で収集を打ち切る
export async function collectForGenre(
  genre: GenreConfig,
  horizons: [Horizon, Horizon],
  call: CollectCallFn,
  options: CollectForGenreOptions = {},
): Promise<CollectForGenreResult> {
  const maxAttempts = options.maxAttempts ?? 2
  let lastReason: CollectionFailureReason = 'other'

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await call(genre, horizons)
      const classified = classifyResponse(res, genre, horizons)
      if (classified.kind === 'ok') {
        return { status: 'ok', candidates: classified.candidates }
      }
      if (classified.kind === 'quota') {
        // 利用上限枯渇: 同じ実行内でリトライしても回復しないため、やり直さず即座に打ち切る
        throw new QuotaExhaustedError(classified.detail)
      }
      // invalid-format: 次の試行へ
      lastReason = 'invalid-format'
      console.error(`${genre.label}: 収集に失敗しました(${attempt}回目): ${classified.detail}`)
    } catch (error) {
      if (error instanceof QuotaExhaustedError) throw error
      if (error instanceof TimeoutError) {
        lastReason = 'timeout'
      } else {
        lastReason = 'other'
      }
      console.error(`${genre.label}: 収集に失敗しました(${attempt}回目): ${(error as Error).message}`)
    }
  }

  return { status: 'collection-failed', reason: lastReason }
}

// --- ここから下はCLI本体(TDD対象外。design.md「ジャンルごとに候補を集める処理」参照) ---

const REQUIREMENTS_PATH = path.join(process.cwd(), 'specs/future-digest/content-selection/requirements.md')
const CLAUDE_TIMEOUT_MS = Number(process.env.FUTURE_DIGEST_COLLECT_TIMEOUT_MS ?? 10 * 60 * 1000)

function buildPrompt(genre: GenreConfig, horizons: [Horizon, Horizon], deliveredIndex: DeliveredIndex, requirements: string): string {
  const themesNote = genre.themes ? `\n個人的注目分野のテーマ: ${genre.themes.join('、')}` : ''
  const deliveredLines = deliveredIndex.lines.length > 0 ? deliveredIndex.lines.join('\n') : '(まだ配信済みの予測はありません)'

  return `あなたは「週刊未来予測」の未来予測記事の収集を担当するエージェントです。以下の要件定義に厳密に従って、ジャンル「${genre.label}」の未来予測記事をWebSearch・WebFetchで探してください。

# 要件定義(content-selection/requirements.md)
${requirements}

# ジャンルの説明
${genre.description}${themesNote}

# 今回の時間軸2区分
${horizons.join('、')}(いずれも配信日を基準点とする。定義はrequirements.md#時間軸を参照)

# 配信済みの予測一覧(実質的に同じ内容は候補にしないこと。ジャンル/時間軸/見出し/元記事タイトルの順)
${deliveredLines}

各時間軸ごとに、採用基準を満たす未来予測記事を最大5件探し、影響度(large/medium/low)・根拠・順位を付けてください。予測の対象時期が明示・推定できない記事、対象時期が配信日から1年未満または既に過ぎている記事、噂・出典不明・断定だけの記事、Claude自身の予測は候補にしないでください。性・恋愛ジャンルの場合は、未成年が関わる内容・特定の店舗や相手を探す手助けになる情報を候補にしないでください。

次のJSON形式のみで応答してください。トップレベルのキーは必ず"${horizons[0]}"と"${horizons[1]}"の2つにしてください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けないでください。**この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文を返してはいけません(返答する相手がいません)。**候補が見つからない時間軸は空配列にしてください。

{"${horizons[0]}": [{"impact": "high", "impactRank": 1, "impactReason": "...", "targetPeriod": "2030年まで", "sourceTitle": "...", "sourceName": "...", "sourceUrl": "https://...", "publishedAt": null}], "${horizons[1]}": []}`
}

async function callClaudeCode(genre: GenreConfig, horizons: [Horizon, Horizon], deliveredIndex: DeliveredIndex, requirements: string): Promise<ClaudeCliResponse> {
  const prompt = buildPrompt(genre, horizons, deliveredIndex, requirements)
  try {
    const { stdout } = await execFileAsync(
      'claude',
      ['-p', prompt, '--output-format', 'json', '--allowedTools', 'WebSearch,WebFetch', '--dangerously-skip-permissions'],
      { maxBuffer: 1024 * 1024 * 32, timeout: CLAUDE_TIMEOUT_MS },
    )
    return JSON.parse(stdout) as ClaudeCliResponse
  } catch (error) {
    const withMeta = error as { stdout?: string; killed?: boolean; signal?: string }
    if (withMeta.killed || withMeta.signal === 'SIGTERM') {
      throw new TimeoutError(`Claude CLI呼び出しがタイムアウトしました(${CLAUDE_TIMEOUT_MS}ms)`)
    }
    if (withMeta.stdout) {
      try {
        return JSON.parse(withMeta.stdout) as ClaudeCliResponse
      } catch {
        // stdoutがJSONでない場合は下のフォールバックに回す
      }
    }
    return { is_error: true, result: (error as Error).message }
  }
}

// scripts/future-digest/collect-and-select.tsから呼ばれる、実行環境に紐づくcollectForGenreの薄いラッパー
export async function collectGenre(genre: GenreConfig, horizons: [Horizon, Horizon], deliveredIndex: DeliveredIndex): Promise<CollectForGenreResult> {
  const requirements = fs.readFileSync(REQUIREMENTS_PATH, 'utf8')
  const call: CollectCallFn = (g, h) => callClaudeCode(g, h, deliveredIndex, requirements)
  return collectForGenre(genre, horizons, call)
}

function main() {
  const genres = getActiveGenres(loadGenres())
  console.error(`収集対象ジャンル数: ${genres.length}件`)
  console.error('このファイルを直接実行する場合はcollect-and-select.tsから呼び出してください(単体では時間軸2区分・配信済み一覧が決まりません)')
}

const isMainModule = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  try {
    main()
  } catch (error: unknown) {
    console.error(error)
    process.exit(1)
  }
}
