// 見出し・本文生成の失敗分類・リトライ制御(仕様: content-generation/design.md「見出し・本文を書く処理」
// 手順6・「エラーハンドリング」、weekly-publish/design.md「1回分の記事を生成する処理」手順4、
// weekly-publish/requirements.md#掲載件数の保証-2)。
//
// Claude Code CLIのヘッドレス起動そのもの(execFile)はscripts/trend-digest/generate-content.tsが担い、
// 本モジュールは「CLIの応答をどう分類し、失敗した候補をどう扱うか」という決定的ロジックのみを持つ
// (CLI呼び出しを注入できる形にしてvitestで完全にテストする。ai-dev-digestのgenerateContent.tsと同じ構成)
import { isValidTopicBodyLength } from './bodyValidation'
import type { Candidate } from './candidateTypes'

// エージェントが生成する記事1トピック分の内容(見出し+本文。content-generation/design.md
// 「見出し・本文を書く処理」応答JSONの形式)
export type GeneratedContent = {
  heading: string
  body: string
}

// Claude Code CLI(`claude -p ... --output-format json`)の応答のうち、分類に使うフィールドのみを型にする。
// resultに実際の応答テキスト(JSONオブジェクトを含む想定)が入る。利用上限到達などのAPIエラー時は
// is_error=trueとなり、api_error_status(HTTPステータス)・resultにエラーメッセージが入る
export type ClaudeCliResponse = {
  result?: string
  is_error?: boolean
  api_error_status?: number
}

export type ClassifiedResult =
  | { kind: 'ok'; content: GeneratedContent }
  | { kind: 'transient'; detail: string } // 同じ入力の再試行で回復しうる失敗
  | { kind: 'quota'; detail: string } // 利用枠の枯渇(再試行しても回復しない)

// 利用枠の枯渇(週次/5時間ごとの上限到達)かどうか。Claude Code CLIは上限到達時に
// api_error_status=429と「You've hit your weekly limit」等のresultを、いずれもis_error=trueの
// APIエラー封筒として返す。メッセージベースの判定はis_error=trueのエラー封筒に限定する
// (成功応答の記事本文が偶然同じ文言を含んでいるだけのケースを誤って枯渇と判定しないため。
// ai-dev-digestのgenerateContent.tsと同じ考え方)
function isQuotaExhausted(res: ClaudeCliResponse): boolean {
  if (res.api_error_status === 429) return true
  if (!res.is_error) return false
  const text = res.result ?? ''
  return /hit your (weekly|usage|5-hour) limit|usage limit reached|rate limit/i.test(text)
}

// エージェントが生成した内容として使えるか(見出しが非空文字列・本文が160〜480字)を判定する
// (content-generation/design.md「本文の分量を検証する処理」)。取得困難でheading/bodyがnullの応答も
// ここで弾かれる(design.md「見出し・本文を書く処理」応答JSONの形式)
function isUsableContent(value: unknown): value is GeneratedContent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { heading?: unknown; body?: unknown }
  if (typeof v.heading !== 'string' || v.heading.trim() === '') return false
  if (!isValidTopicBodyLength(v.body)) return false
  return true
}

// CLI応答を成功/一時的失敗/利用枠枯渇の3種に分類する
// (content-generation/design.md「見出し・本文を書く処理」手順6・「エラーハンドリング」)
export function classifyGenerationResult(res: ClaudeCliResponse): ClassifiedResult {
  // 利用枠枯渇はis_errorの有無より先に判定する(枯渇はリトライ対象外・即打ち切りのため区別が最優先)
  if (isQuotaExhausted(res)) {
    return { kind: 'quota', detail: res.result ?? '(メッセージなし)' }
  }
  if (res.is_error) {
    return { kind: 'transient', detail: res.result ?? '(メッセージなし)' }
  }
  const text = res.result ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    return { kind: 'transient', detail: `応答からJSONを抽出できませんでした: ${text}` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return { kind: 'transient', detail: `応答のJSONをパースできませんでした: ${text}` }
  }
  if (!isUsableContent(parsed)) {
    return { kind: 'transient', detail: '見出しが空、または本文の分量が不正(160〜480字の範囲外)な応答でした' }
  }
  return { kind: 'ok', content: parsed }
}

// 利用枠の枯渇でその回の生成を続行できないことを表す例外(その候補以降を打ち切り、非ゼロ終了させる)
export class QuotaExhaustedError extends Error {
  constructor(detail: string) {
    super(`利用枠の枯渇によりその回の生成を打ち切りました: ${detail}`)
    this.name = 'QuotaExhaustedError'
  }
}

// 選定された全候補の生成が失敗したことを表す例外(その回は記事を公開しない)
export class AllTopicsFailedError extends Error {
  constructor() {
    super('選定された全候補の生成に失敗しました(その回の記事は公開しません)')
    this.name = 'AllTopicsFailedError'
  }
}

// 1候補分の生成を行う関数。scripts側がClaude Code CLIのヘッドレス起動を注入する(テストではモックを渡す)
export type GenerateCallFn = (candidate: Candidate) => Promise<ClaudeCliResponse>

export type GeneratedTopic = { candidate: Candidate; content: GeneratedContent }

export type GenerateTopicsOptions = {
  // 1候補あたりの最大試行回数(初回+リトライ)。design.mdの既定は2(初回+1回)
  maxAttempts?: number
  // 除外した候補を記録するためのコールバック(scriptsはconsole.errorでActionsログに残す)
  onExcluded?: (info: { candidate: Candidate; attempts: number; detail: string }) => void
}

// 選定された候補を1件ずつ生成し、一時的失敗はmaxAttemptsまでリトライ、それでも失敗する候補は除外して継続する。
// 利用枠枯渇を検知したら以降の候補を呼ばず即座に打ち切り、全候補が失敗した場合は例外を投げる
// (weekly-publish/design.md「1回分の記事を生成する処理」手順4・「エラーハンドリング」、
//  weekly-publish/requirements.md#掲載件数の保証-2)
export async function generateTopics(
  candidates: Candidate[],
  call: GenerateCallFn,
  options: GenerateTopicsOptions = {},
): Promise<GeneratedTopic[]> {
  const maxAttempts = options.maxAttempts ?? 2
  const succeeded: GeneratedTopic[] = []

  for (const candidate of candidates) {
    let lastDetail = ''
    let ok = false
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const classified = classifyGenerationResult(await call(candidate))
      if (classified.kind === 'ok') {
        succeeded.push({ candidate, content: classified.content })
        ok = true
        break
      }
      if (classified.kind === 'quota') {
        // 利用枠枯渇: 同じ実行内でリトライしても回復しないため、以降の候補を呼ばず即打ち切り
        throw new QuotaExhaustedError(classified.detail)
      }
      lastDetail = classified.detail // transient → 次の試行へ
    }
    if (!ok) {
      // maxAttempts回失敗 → この候補だけ除外して次の候補へ(1件の失敗で全体を落とさない)
      options.onExcluded?.({ candidate, attempts: maxAttempts, detail: lastDetail })
    }
  }

  if (succeeded.length === 0) {
    throw new AllTopicsFailedError()
  }
  return succeeded
}
