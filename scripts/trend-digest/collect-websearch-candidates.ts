// WebSearchジャンルの候補収集(仕様: requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-1〜6、
// design.md「WebSearchジャンルの候補を収集・判定する処理(エージェントの推論)」)。TDD対象外
// (Claude Code CLIのヘッドレス起動そのものであり、検索・判定自体に検証可能な決定的ロジックがないため。
// 応答の分類・独立情報源数の基準適用はapp/trend-digest/lib/collectWebSearchCandidates.tsに切り出し、
// __tests__/trend-digest/lib/collectWebSearchCandidates.test.tsで検証済み。tasks.md Task7参照)。
//
// 対象ジャンルのsearchHintsを手がかりにWebSearchツールで話題を検索する。独立情報源数が
// minIndependentSources未満の話題も観測項目として保持し(採用基準の判定はcollectWebSearchCandidates
// が行う)、trend-historyの履歴へ引き渡す。scripts/trend-digest/collect-and-select.tsが
// 対象editionのWebSearchジャンルごとにcollectWebSearchGenre()を呼び出す(このファイル単体では実行しない)
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { collectWebSearchCandidates, type ClaudeCliResponse, type WebSearchCallFn } from '../../app/trend-digest/lib/collectWebSearchCandidates'
import type { WatchlistEntry, Criteria } from '../../app/trend-digest/lib/watchlistTypes'
import criteriaData from '../../content/trend-digest/criteria.json'

const execFileAsync = promisify(execFile)
const criteria = criteriaData as Criteria

// dev-trends(開発手法・開発サービス)専用の追加指示(requirements.md#ジャンルごとの情報源・採用基準(WebSearchジャンル)-10、
// design.md「WebSearchジャンルの候補を収集・判定する処理」手順5)。ai-dev-digestが日次で個々のリリースを
// 報じているため、このジャンルでは「開発の進め方・道具立ての変化」という潮流だけを対象にする
const DEV_TRENDS_GUIDANCE =
  '\n\nこのジャンルでは、個々の製品リリース・バージョンアップを報じる記事だけを根拠にした話題は対象にしないでください。複数の情報源が「開発の進め方・道具立てが変わりつつある」と論じている潮流だけを話題としてください(日次配信のai-dev-digestが個々のリリースは既に扱っているため、重複を避けます)。'

// design.md手順1「ジャンルごとのsearchHintsを手がかりに...話題を検索する」、
// design.md手順2「採用基準の判定を行う前に...上位maxObservationsPerSource件まで保持する」
// (=独立情報源数が少ない話題も含めてすべて報告させ、採用基準の判定はコード側で行う)、
// design.md手順6〜8(JSON形式・応答形式のガードレール)をプロンプトに反映する
function buildPrompt(entry: WatchlistEntry): string {
  const hints = (entry.searchHints ?? []).join('」「')
  const genreGuidance = entry.genre === 'dev-trends' ? DEV_TRENDS_GUIDANCE : ''
  return `あなたは「トレンドダイジェスト」の話題収集を担当するエージェントです。ジャンル「${entry.label}」について、WebSearchツールを使い次の観点で最近の話題を検索してください: 「${hints}」${genreGuidance}

見つかった話題は、独立した言及元が少数(1〜2件)であっても省略せず、確認できたすべての話題を報告してください。話題ごとに、その話題を独立に言及している情報源(ニュースメディアの記事・SNS上の投稿・口コミ・レビューサイトでの評判増加等、性質の異なる複数の言及元)の数を正確に数えてください。同一運営者・同一記事の転載、および単一メディアの特集記事(広告・PR記事を含む)は、それが何本の記事に分かれていても「独立した言及元」としては1件だけとして数えてください(1つの編集部の紹介記事を複数件の言及と誤って数えないため)。採用基準(独立した言及元の最低件数)を満たすかどうかの判定はこちらのコード側で行うため、あなたは件数を絞らずすべて報告してください。ただし、噂・未確認情報の域を出ない話題(実在するか確認できない話題)は報告に含めないでください。架空の話題を作らないでください。動きがなければ空配列を返してください。

確認できた話題ごとに、次のJSON配列の形式のみで応答してください。前後に説明文・コードブロックの装飾(\`\`\`等)を付けないでください。**この処理はヘッドレス実行のため、運営者に判断を仰ぐ質問文を返してはいけません(返答する相手がいません)。**

[{"title": "話題の名称", "sourceName": "代表的な出典の情報源名(最初に見つかった、または最も権威のあるメディア)", "sourceUrl": "出典の元URL", "independentSourceCount": 2, "breakdown": "言及元の内訳(例: ニュースメディア2件+SNS言及1件)"}]`
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
  return collectWebSearchCandidates(entry, genreCriteria, call, criteria.history.maxObservationsPerSource)
}
