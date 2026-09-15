// WebSearchジャンルの候補収集(仕様: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1〜6、
// design.md「WebSearchジャンルの候補を収集・判定する処理(エージェントの推論)」)。TDD対象外
// (Claude Code CLIのヘッドレス起動そのものであり、検索・判定自体に検証可能な決定的ロジックがないため。
// 応答の分類・独立情報源数の基準適用はapp/trend-digest/lib/collectWebSearchCandidates.tsに切り出し、
// __tests__/trend-digest/lib/collectWebSearchCandidates.test.tsで検証済み。tasks.md Task7参照)。
//
// 対象ジャンルのsearchHintsを手がかりにWebSearchツールで話題を検索し、独立情報源数が
// minIndependentSources以上の話題のみを候補とする。scripts/trend-digest/collect-and-select.tsが
// 対象editionのWebSearchジャンルごとにcollectWebSearchGenre()を呼び出す(このファイル単体では実行しない)
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { collectWebSearchCandidates, type ClaudeCliResponse, type WebSearchCallFn } from '../../app/trend-digest/lib/collectWebSearchCandidates'
import type { WatchlistEntry, Criteria } from '../../app/trend-digest/lib/watchlistTypes'
import criteriaData from '../../content/trend-digest/criteria.json'

const execFileAsync = promisify(execFile)
const criteria = criteriaData as Criteria

// design.md手順1「ジャンルごとのsearchHintsを手がかりに...話題を検索する」、
// design.md手順2〜4(独立情報源数の判定・応答形式のガードレール)をプロンプトに反映する
function buildPrompt(entry: WatchlistEntry): string {
  const hints = (entry.searchHints ?? []).join('」「')
  return `あなたは「トレンドダイジェスト」の話題収集を担当するエージェントです。ジャンル「${entry.label}」について、WebSearchツールを使い次の観点で最近の話題を検索してください: 「${hints}」

複数の独立した情報源(ニュースメディア・公式発表等)が同じ話題を報じている場合のみ「動きがあった」候補にしてください。単一の情報源のみが報じている話題、または噂・未確認情報の域を出ない話題は候補にしないでください。架空の話題を作らないでください。動きがなければ空配列を返してください。

確認できた話題ごとに、次のJSON配列の形式のみで応答してください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けないでください。**この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文を返してはいけません(返答する相手がいません)。**

[{"title": "話題の名称", "sourceName": "代表的な出典の情報源名(最初に見つかった、または最も権威のあるメディア)", "sourceUrl": "出典の元URL", "independentSourceCount": 2}]`
}

// Claude Code CLIを非対話モード(-p)で1回呼び出す。利用上限到達等ではCLIが非ゼロ終了しexecFileが
// rejectするが、その場合もstdoutに{is_error:true, ...}が入るため、rejectのstdoutからパースして分類に回す
// (ai-dev-digest scripts/generate-content.tsのcallClaudeCodeと同じ考え方)
const callClaudeCode: (entry: WatchlistEntry) => Promise<ClaudeCliResponse> = async (entry) => {
  const prompt = buildPrompt(entry)
  try {
    const { stdout } = await execFileAsync(
      'claude',
      ['-p', prompt, '--output-format', 'json', '--dangerously-skip-permissions'],
      { maxBuffer: 1024 * 1024 * 32 }
    )
    return JSON.parse(stdout) as ClaudeCliResponse
  } catch (error) {
    const withStdout = error as { stdout?: string }
    if (withStdout.stdout) {
      try {
        return JSON.parse(withStdout.stdout) as ClaudeCliResponse
      } catch {
        // stdoutがJSONでない場合は下のフォールバックに回す
      }
    }
    return { is_error: true, result: (error as Error).message }
  }
}

const call: WebSearchCallFn = callClaudeCode

// 1ジャンル分のWebSearch収集を行う。collect-and-select.tsが対象editionのWebSearchジャンルごとに呼び出す
export async function collectWebSearchGenre(entry: WatchlistEntry) {
  const genreCriteria = criteria.genreCriteria[entry.genre]
  if (genreCriteria.method !== 'websearch') {
    throw new Error(`${entry.genre}はWebSearchジャンルではありません`)
  }
  return collectWebSearchCandidates(entry, genreCriteria, call)
}
