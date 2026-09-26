// 生成結果の利用可否判定(仕様: design.md「エラーハンドリング」)。
// Claude Code CLIのヘッドレス起動そのもの(execFile)はscripts/news-digest/generate-content.tsが担い、
// 本モジュールは「1候補分の応答が記事として使える内容か」という決定的ロジックのみを持つ
// (CLI呼び出しを注入せずvitestで完全にテストできる)
import { isValidSummaryDetailLength, isValidImportance } from './summaryValidation'
import type { Importance, TopicSummary } from './types'

// エージェントが生成する記事1トピック分の内容(見出し+重要度+固定4観点の要約。
// design.md「要約を書く処理」応答JSONの形式)
export type GeneratedContent = {
  heading: string
  importance: Importance
  summary: TopicSummary
}

// エージェントの応答(パース済みJSON)が記事として利用可能かどうかを判定する
// (design.md「エラーハンドリング」: summaryがnull、またはTask2の分量検証(isValidSummaryDetailLength)・
// 重要度検証(isValidImportance)に失敗する場合は、その候補1件の生成失敗として扱う)
export function isUsableContent(response: unknown): response is GeneratedContent {
  if (typeof response !== 'object' || response === null) return false
  const value = response as { heading?: unknown; importance?: unknown; summary?: unknown }
  if (typeof value.heading !== 'string' || value.heading.trim() === '') return false
  if (!isValidImportance(value.importance)) return false
  return isValidSummaryDetailLength(value.summary)
}

// Claude Code CLI起動失敗時のエラーテキスト(stdout/stderr/エラーメッセージを結合したもの)が
// 利用枠の枯渇を示すかどうかの判定(design.md「エラーハンドリング」、requirements.md#掲載件数の保証-2)。
// 大文字小文字を区別せず、rate_limit/session limit/usage limit/429のいずれかを含めば枯渇とみなす。
// 1候補だけの単純な生成失敗(JSON不正など)とは区別し、呼び出し元(generate-content.ts)が
// 専用の終了コード(exit 2)で即座に打ち切れるようにする
export function isQuotaExhaustionError(text: string): boolean {
  return /rate_limit|session limit|usage limit|429/i.test(text)
}
