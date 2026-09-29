// ジャンルごとの収集CLI(仕様: content-selection/design.md「ジャンルごとに候補を集める処理」
// 「エラーハンドリング」)。Claude Code CLIのヘッドレス起動そのもの(execFile)は実行時のみ発生し、
// テストではcollectForGenreにcallを注入して「応答の分類・やり直し・分類ラベルへの変換」という
// 決定的ロジックだけを検証する(future-digestのcollect-candidates.tsと同じ考え方。tasks.md Task 5)
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Candidate, CollectionFailureReason } from '../../app/research-digest/lib/candidateTypes'
import { validateCandidates } from '../../app/research-digest/lib/candidateValidation'
import type { GenreConfig } from '../../app/research-digest/lib/genres'
import { loadGenres, getActiveGenres } from '../../app/research-digest/lib/genres'
import type { DeliveredIndex } from '../../app/research-digest/lib/deliveredIndex'
import { IMPACT_ORDER } from '../../app/research-digest/lib/types'

const execFileAsync = promisify(execFile)

// 応答に含めさせる候補の最大件数(design.md「ジャンルごとに候補を集める処理」手順8)
const MAX_CANDIDATES_PER_GENRE = 5

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
export type CollectCallFn = (genre: GenreConfig) => Promise<ClaudeCliResponse>

// 利用枠の枯渇(週次/5時間ごとの上限到達)かどうか(is_error=trueのAPIエラー封筒に限定して判定する。
// 成功応答の本文が偶然同じ文言を含むだけのケースを誤って枯渇と判定しないため)
function isQuotaExhausted(res: ClaudeCliResponse): boolean {
  if (res.api_error_status === 429) return true
  if (!res.is_error) return false
  const text = res.result ?? ''
  return /hit your (weekly|usage|5-hour) limit|usage limit reached|rate limit/i.test(text)
}

type Classified =
  | { kind: 'ok'; candidates: Candidate[]; rejectedCount: number }
  | { kind: 'invalid-format'; detail: string }
  | { kind: 'other'; detail: string }
  | { kind: 'quota'; detail: string }

// CLI応答を成功/形式不正/異常終了/利用枠枯渇に分類する(design.md「ジャンルごとに候補を集める処理」手順9)。
// 応答は候補の配列。全体の形が読み取れなければinvalid-format、候補単位の検証で全件捨てられても成功(0件)
function classifyResponse(res: ClaudeCliResponse, genre: GenreConfig, today: Date): Classified {
  if (isQuotaExhausted(res)) {
    return { kind: 'quota', detail: res.result ?? '(メッセージなし)' }
  }
  if (res.is_error) {
    // Claude CLI自体が異常終了した場合(利用上限を除く)は、正常終了したが応答が不正な
    // invalid-formatとは区別し、otherに分類する(design.md「エラーハンドリング」)
    return { kind: 'other', detail: res.result ?? '(メッセージなし)' }
  }
  const text = res.result ?? ''
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) {
    return { kind: 'invalid-format', detail: `応答からJSONの配列を抽出できませんでした: ${text}` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return { kind: 'invalid-format', detail: `応答のJSONをパースできませんでした: ${text}` }
  }
  if (!Array.isArray(parsed)) {
    return { kind: 'invalid-format', detail: '応答が候補の配列の形式を満たしていません' }
  }

  // ジャンルidを補い、候補単位のバリデーションにかける(候補単位で全件捨てられても収集失敗にはしない)
  const raw = parsed.map((item) => ({ ...(item as Record<string, unknown>), genre: genre.id }))
  const { candidates, rejected } = validateCandidates(raw, today)
  for (const r of rejected) {
    console.error(`${genre.label}: 候補[${r.index}]を検証で除外しました: ${r.reason}`)
  }
  return { kind: 'ok', candidates, rejectedCount: rejected.length }
}

export type CollectForGenreOptions = {
  maxAttempts?: number // 1ジャンルあたりの最大試行回数(初回+リトライ)。design.mdの既定は2
  today?: Date // 発表年の上限を求める基準日(既定は現在日時)
}

// 1ジャンル分の候補を収集する(design.md「ジャンルごとに候補を集める処理」「エラーハンドリング」)。
// 応答からJSONを取り出せない・応答全体の形を満たさない・Claude CLIが異常終了した・タイムアウトを
// 超えた場合は、いずれも同じく最大2回まで(初回+1回)起動し直す。それでも失敗した場合はそのジャンルを
// collection-failedとして返す(候補なしとは区別する。requirements.md#収集失敗-1)。
// 利用上限への到達を示す応答は、やり直さずQuotaExhaustedErrorを投げてその時点で収集を打ち切る
export async function collectForGenre(
  genre: GenreConfig,
  call: CollectCallFn,
  options: CollectForGenreOptions = {},
): Promise<CollectForGenreResult> {
  const maxAttempts = options.maxAttempts ?? 2
  const today = options.today ?? new Date()
  let lastReason: CollectionFailureReason = 'other'

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const classified = classifyResponse(await call(genre), genre, today)
      if (classified.kind === 'ok') {
        const retryNote = attempt > 1 ? `(${attempt}回目で成功)` : ''
        console.error(
          `${genre.label}: 収集に成功しました${retryNote} 候補${classified.candidates.length}件 / 検証で除外${classified.rejectedCount}件`,
        )
        return { status: 'ok', candidates: classified.candidates }
      }
      if (classified.kind === 'quota') {
        // 利用枠枯渇: 同じ実行内でリトライしても回復しないため、やり直さず即座に打ち切る
        throw new QuotaExhaustedError(classified.detail)
      }
      // invalid-format/other: 次の試行へ
      lastReason = classified.kind
      console.error(`${genre.label}: 収集に失敗しました(${attempt}/${maxAttempts}回目・${classified.kind}): ${classified.detail}`)
    } catch (error) {
      if (error instanceof QuotaExhaustedError) throw error
      lastReason = error instanceof TimeoutError ? 'timeout' : 'other'
      console.error(`${genre.label}: 収集に失敗しました(${attempt}/${maxAttempts}回目・${lastReason}): ${(error as Error).message}`)
    }
  }

  console.error(`${genre.label}: ${maxAttempts}回とも失敗したため収集失敗として扱います(分類ラベル: ${lastReason})`)
  return { status: 'collection-failed', reason: lastReason }
}

// --- ここから下はCLI本体(TDD対象外。design.md「ジャンルごとに候補を集める処理」参照) ---

const REQUIREMENTS_PATH = path.join(process.cwd(), 'specs/research-digest/content-selection/requirements.md')
const CLAUDE_TIMEOUT_MS = Number(process.env.RESEARCH_DIGEST_COLLECT_TIMEOUT_MS ?? 10 * 60 * 1000)

function buildPrompt(genre: GenreConfig, deliveredIndex: DeliveredIndex, requirements: string, scheduledPublishDate: string): string {
  const deliveredLines = deliveredIndex.lines.length > 0 ? deliveredIndex.lines.join('\n') : '(まだ配信済みの研究はありません)'
  const year = scheduledPublishDate.slice(0, 4)
  const impactValues = IMPACT_ORDER.join('/')

  return `あなたは「週刊研究発見」の研究・論文の収集を担当するエージェントです。以下の要件定義に厳密に従って、ジャンル「${genre.label}」の研究の発見・論文をWebSearch・WebFetchで探してください。

# 要件定義(content-selection/requirements.md)
${requirements}

# ジャンルの説明
${genre.description}

# 今回の配信日
${scheduledPublishDate}(発表年は${year}年以下のものだけを候補にすること)

# 配信済みの研究一覧(実質的に同じ研究は、それを扱う別の報道も含めて候補にしないこと。ジャンル/見出し/論文名の順)
${deliveredLines}

採用基準を満たす研究を最大${MAX_CANDIDATES_PER_GENRE}件探し、日々の生活への影響度(${impactValues})・根拠(1文)・同じ影響度の中での順位を付けてください。科学系の報道をきっかけにしてもよいが、元の論文・公式発表をWebFetchで開いて確かめられたものだけを候補にし、sourceUrlには報道記事ではなくその論文・公式発表のURLを使ってください。査読前の論文(プレプリント)はisPreprintをtrueにしてください。出典を確かめられない話題、健康食品などの宣伝を目的とした発表は候補にしないでください。有料購読が必要な論文でも、要旨・公式発表など公開されている範囲で確かめてください。

次のJSON形式の配列のみで応答してください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けないでください。**この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文を返してはいけません(返答する相手がいません)。**候補が見つからない場合は空の配列[]にしてください。doiと発表年(publishedYear)が分からない場合はnullにしてください。

[{"impact": "high", "impactRank": 1, "impactReason": "...", "sourceTitle": "...", "sourceName": "...", "sourceUrl": "https://...", "doi": "10.xxxx/xxxx", "publishedYear": 2025, "isPreprint": false}]`
}

// Claude Code CLIへ渡す起動引数(純粋関数として切り出し、テストで検証できるようにする)。
// --dangerously-skip-permissionsは全ツールを確認なしで許可してしまうため使わない。
// --toolsで利用可能なツール自体をWebSearch・WebFetchに絞り(Bash・Read・Edit等を呼び出し不能にする)、
// --allowedToolsで確認なしに使えるツールも同じ2つに限定する(content-selection/design.md「セキュリティ」)
export function buildClaudeArgs(prompt: string): string[] {
  return ['-p', prompt, '--output-format', 'json', '--tools', 'WebSearch,WebFetch', '--allowedTools', 'WebSearch,WebFetch']
}

async function callClaudeCode(prompt: string): Promise<ClaudeCliResponse> {
  try {
    const { stdout } = await execFileAsync('claude', buildClaudeArgs(prompt), {
      maxBuffer: 1024 * 1024 * 32,
      timeout: CLAUDE_TIMEOUT_MS,
    })
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

// collect-and-select.tsから呼ばれる、実行環境に紐づくcollectForGenreの薄いラッパー。
// scheduledPublishDate(本来の配信日)はプロンプトに明示し、発表年の上限の基準にも使う
export async function collectGenre(genre: GenreConfig, deliveredIndex: DeliveredIndex, scheduledPublishDate: string): Promise<CollectForGenreResult> {
  const requirements = fs.readFileSync(REQUIREMENTS_PATH, 'utf8')
  const call: CollectCallFn = (g) => callClaudeCode(buildPrompt(g, deliveredIndex, requirements, scheduledPublishDate))
  // 再実行cronが日付をまたいでも、本来の配信日の年で発表年の上限を判定する(正午指定でタイムゾーンによる年ずれを避ける)
  return collectForGenre(genre, call, { today: new Date(`${scheduledPublishDate}T12:00:00`) })
}

function main() {
  const genres = getActiveGenres(loadGenres())
  console.error(`収集対象ジャンル数: ${genres.length}件`)
  console.error('このファイルを直接実行する場合はcollect-and-select.tsから呼び出してください(単体では配信日・配信済み一覧が決まりません)')
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
