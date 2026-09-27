// 見出し・本文生成の失敗分類・リトライ制御(仕様: content-generation/design.md「見出し・本文を書く処理」
// 手順8・「エラーハンドリング」、weekly-publish/design.md「1回分の記事を生成する処理」手順4、
// weekly-publish/requirements.md#掲載件数の保証-4)。
//
// Claude Code CLIのヘッドレス起動そのもの(execFile)はscripts/future-digest/generate-content.tsが担い、
// 本モジュールは「CLIの応答をどう分類し、失敗した候補をどう扱うか」という決定的ロジックのみを持つ
// (trend-digestのgenerateContent.tsと同じ構成)。
//
// trend-digestとの違い: 採用候補全件の生成が失敗しても例外を投げず「生成に失敗した枠」として返す
// (weekly-publish/requirements.md#掲載件数の保証-4「採用0件でも記事を作り配信する」方針との一貫性のため。
// 例外を投げるのは利用上限への到達〈QuotaExhaustedError〉だけ)
import { isValidBodyLength, isValidHeading } from './bodyValidation'
import type { Candidate } from './candidateTypes'
import { buildPrediction, type GeneratedContent } from './buildPrediction'
import type { Prediction } from './types'

// Claude Code CLI(`claude -p ... --output-format json`)の応答のうち、分類に使うフィールドのみを型にする
export type ClaudeCliResponse = {
  result?: string
  is_error?: boolean
  api_error_status?: number
}

export type ClassifiedResult =
  | { kind: 'ok'; content: GeneratedContent }
  | { kind: 'transient'; detail: string } // 同じ入力の再試行で回復しうる失敗
  | { kind: 'quota'; detail: string } // 利用枠の枯渇(再試行しても回復しない)

// 利用枠の枯渇(週次/5時間ごとの上限到達)かどうか(is_error=trueのAPIエラー封筒に限定して判定する。
// 成功応答の本文が偶然同じ文言を含むだけのケースを誤って枯渇と判定しないため)
function isQuotaExhausted(res: ClaudeCliResponse): boolean {
  if (res.api_error_status === 429) return true
  if (!res.is_error) return false
  const text = res.result ?? ''
  return /hit your (weekly|usage|5-hour) limit|usage limit reached|rate limit/i.test(text)
}

function isUsableContent(value: unknown): value is GeneratedContent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { heading?: unknown; body?: unknown }
  if (!isValidHeading(v.heading)) return false
  if (!isValidBodyLength(v.body)) return false
  return true
}

// CLI応答を成功/一時的失敗/利用枠枯渇の3種に分類する(content-generation/design.md「見出し・本文を書く処理」
// 手順8・「エラーハンドリング」)
export function classifyGenerationResult(res: ClaudeCliResponse): ClassifiedResult {
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
    return { kind: 'transient', detail: '見出しが空・100字超、または本文の分量が不正(160〜480字の範囲外)な応答でした' }
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

export type GenerateCallFn = (candidate: Candidate) => Promise<ClaudeCliResponse>

export type GeneratedPrediction = { candidate: Candidate; prediction: Prediction }
export type GenerationFailure = { candidate: Candidate; detail: string }
export type GeneratePredictionsResult = {
  succeeded: GeneratedPrediction[]
  failed: GenerationFailure[] // 「生成に失敗した枠」として記事データのemptySlotsに残す対象
}

export type GeneratePredictionsOptions = {
  // 1候補あたりの最大試行回数(初回+リトライ)。design.mdの既定は2(初回+1回)
  maxAttempts?: number
  // 除外した候補を記録するためのコールバック(scriptsはconsole.errorでActionsログに残す)
  onExcluded?: (info: { candidate: Candidate; attempts: number; detail: string }) => void
}

// 採用された候補を1件ずつ生成し、一時的失敗はmaxAttemptsまでリトライ、それでも失敗する候補は
// 「生成に失敗した枠」として除いて継続する(weekly-publish/design.md「1回分の記事を生成する処理」手順4)。
// 採用候補全件が失敗しても例外を投げず全件を失敗として返す(weekly-publish/requirements.md#掲載件数の保証-4。
// 採用0件・全件失敗でも公開をスキップしない方針との一貫性のため、trend-digestのgenerateTopicsと異なり
// AllTopicsFailedError相当の例外は投げない)。利用枠枯渇を検知したら以降の候補を呼ばず即座に打ち切る
export async function generatePredictions(
  candidates: Candidate[],
  call: GenerateCallFn,
  options: GeneratePredictionsOptions = {},
): Promise<GeneratePredictionsResult> {
  const maxAttempts = options.maxAttempts ?? 2
  const succeeded: GeneratedPrediction[] = []
  const failed: GenerationFailure[] = []

  for (const candidate of candidates) {
    let lastDetail = ''
    let ok = false
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const classified = classifyGenerationResult(await call(candidate))
      if (classified.kind === 'ok') {
        succeeded.push({ candidate, prediction: buildPrediction(candidate, classified.content) })
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
      // maxAttempts回失敗 → この候補は「生成に失敗した枠」として除外し次の候補へ(1件の失敗で全体を落とさない)
      failed.push({ candidate, detail: lastDetail })
      options.onExcluded?.({ candidate, attempts: maxAttempts, detail: lastDetail })
    }
  }

  return { succeeded, failed }
}
