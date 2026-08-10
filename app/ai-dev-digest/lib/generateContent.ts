// 翻訳・要約生成の失敗分類・リトライ制御(仕様: content-generation/design.md「要約を書く処理」手順8・
// 「エラーハンドリング」、daily-publish/design.md「1日分の記事を生成する処理」手順4-5・「エラーハンドリング」、
// daily-publish/requirements.md#掲載件数の保証-3)。
//
// Claude Code CLIのヘッドレス起動そのもの(execFile)はscripts/ai-dev-digest/generate-content.tsが担い、
// 本モジュールは「CLIの応答をどう分類し、失敗した候補をどう扱うか」という決定的ロジックのみを持つ
// (CLI呼び出しを注入できる形にしてvitestで完全にテストする)。
import type { SummarySection } from './types'
import type { SelectedTopic } from './candidateTypes'

// エージェントが生成する記事1トピック分の内容(見出し+章立て要約)
export type GeneratedContent = {
  heading: string
  sections: SummarySection[]
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
// APIエラー封筒として返す。メッセージベースの判定を成功応答にも走らせると、AI開発ツールの利用上限を
// 話題にした記事本文(res.result)が上限到達の文言を引用しているだけで枯渇と誤判定し、その日全体を
// 打ち切ってしまう。これを防ぐため、メッセージベースの判定はis_error=trueのエラー封筒に限定する
// (api_error_statusは成功応答には存在しない構造化フィールドのため、gate外でそのまま判定してよい)
function isQuotaExhausted(res: ClaudeCliResponse): boolean {
  if (res.api_error_status === 429) return true
  if (!res.is_error) return false
  const text = res.result ?? ''
  return /hit your (weekly|usage|5-hour) limit|usage limit reached|rate limit/i.test(text)
}

// エージェントが生成した内容として使えるか(見出しと1件以上の非空sectionが揃っているか)を判定する。
// 分量の上下限・セクション数の妥当性はビルド時のparseArticle(article-detail)が検証するため、ここでは
// 「取得不能で空を返してきた」ケース(design手順8)を一時的失敗として弾くための非空チェックにとどめる
function isUsableContent(value: unknown): value is GeneratedContent {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { heading?: unknown; sections?: unknown }
  if (typeof v.heading !== 'string' || v.heading.trim() === '') return false
  if (!Array.isArray(v.sections) || v.sections.length === 0) return false
  return v.sections.every((s) => {
    if (typeof s !== 'object' || s === null) return false
    const sec = s as { heading?: unknown; teaser?: unknown; detail?: unknown }
    return (
      typeof sec.heading === 'string' &&
      sec.heading.trim() !== '' &&
      typeof sec.teaser === 'string' &&
      sec.teaser.trim() !== '' &&
      typeof sec.detail === 'string' &&
      sec.detail.trim() !== ''
    )
  })
}

// CLI応答を成功/一時的失敗/利用枠枯渇の3種に分類する(design.md「要約を書く処理」手順8・「エラーハンドリング」)
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
    return { kind: 'transient', detail: '見出し・sectionsが空、または不完全な応答でした' }
  }
  return { kind: 'ok', content: parsed }
}

// 利用枠の枯渇でその日の生成を続行できないことを表す例外(その候補以降を打ち切り、非ゼロ終了させる)
export class QuotaExhaustedError extends Error {
  constructor(detail: string) {
    super(`利用枠の枯渇によりその日の生成を打ち切りました: ${detail}`)
    this.name = 'QuotaExhaustedError'
  }
}

// 選定された全候補の生成が失敗したことを表す例外(その日は記事を公開せず、非ゼロ終了させる)
export class AllTopicsFailedError extends Error {
  constructor() {
    super('選定された全候補の生成に失敗しました(その日の記事は公開しません)')
    this.name = 'AllTopicsFailedError'
  }
}

// 1候補分の生成を行う関数。scripts側がClaude Code CLIのヘッドレス起動を注入する(テストではモックを渡す)
export type GenerateCallFn = (candidate: SelectedTopic) => Promise<ClaudeCliResponse>

export type GeneratedTopic = { candidate: SelectedTopic; content: GeneratedContent }

export type GenerateTopicsOptions = {
  // 1候補あたりの最大試行回数(初回+リトライ)。design.mdの既定は2(初回+1回)
  maxAttempts?: number
  // 除外した候補を記録するためのコールバック(scriptsはconsole.errorでActionsログに残す)
  onExcluded?: (info: { candidate: SelectedTopic; attempts: number; detail: string }) => void
}

// 選定された候補を1件ずつ生成し、一時的失敗はmaxAttemptsまでリトライ、それでも失敗する候補は除外して継続する。
// 利用枠枯渇を検知したら以降の候補を呼ばず即座に打ち切り、全候補が失敗した場合は例外を投げる
// (daily-publish/design.md「1日分の記事を生成する処理」手順4-5・「エラーハンドリング」、
//  daily-publish/requirements.md#掲載件数の保証-3)
export async function generateTopics(
  candidates: SelectedTopic[],
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
