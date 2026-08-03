// 収集+選定のCLI化(仕様: design.md「関連するファイル」)。
// fetchCandidates(外部通信)とselection(決定的ロジック)を組み合わせて実行するだけの薄い
// ラッパーのため、ロジック自体のテストはfetchCandidates.test.ts/selection.test.tsで担保済み
// (TDD対象外。tasks.md Task6参照)。GitHub Actions(daily-publish)が日次実行時にこのスクリプトを
// 呼び出す(2026-08改定。当初はClaude Routinesを実行主体とする想定だった。daily-publish/design.md
// 「実行環境の前提」参照)。標準出力は選定結果のJSONのみとし(呼び出し元がそのままパースするため)、
// 実行状況のログはstderrに出す(design.md「ログ」)
//
// 実行方法: YOUTUBE_API_KEY=xxx npx tsx scripts/ai-dev-digest/collect-and-select.ts 2026-08-01
import { fetchAllCandidates, fetchHttpClient } from '../../app/ai-dev-digest/lib/fetchCandidates'
import { selectDailyTopics } from '../../app/ai-dev-digest/lib/selection'
import type { WatchlistEntry, Criteria } from '../../app/ai-dev-digest/lib/watchlistTypes'
import watchlistData from '../../content/ai-dev-digest/watchlist.json'
import criteriaData from '../../content/ai-dev-digest/criteria.json'

const watchlist = watchlistData as WatchlistEntry[]
const criteria: Criteria = criteriaData

async function main() {
  const date = process.argv[2]
  if (!date) {
    console.error('使い方: collect-and-select.ts <YYYY-MM-DD>')
    process.exit(1)
  }

  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) {
    console.error('YOUTUBE_API_KEY が環境変数に設定されていません(GitHub Actions Secretsの設定。design.md「実行環境の前提」参照)')
    process.exit(1)
  }

  const candidates = await fetchAllCandidates(watchlist, criteria, apiKey, fetchHttpClient)
  // 収集・選定の実行結果をstderrに記録する(design.md「ログ」。GitHub Actionsの実行ログとして残る)
  console.error(`情報源からの取得候補数: ${candidates.length}件`)

  const result = selectDailyTopics(candidates, criteria)
  if (result.status === 'skipped') {
    console.error(`候補不足によりスキップします: ${result.reason}`)
  } else {
    const belowCriteriaCount = result.topics.filter((t) => t.belowCriteria).length
    console.error(`選定件数: ${result.topics.length}件(うち基準未達: ${belowCriteriaCount}件)`)
  }

  process.stdout.write(JSON.stringify({ date, ...result }, null, 2) + '\n')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
