// 収集+選定のCLI化(仕様: design.md「関連するファイル」)。
// fetchCandidates(外部通信)とselection(決定的ロジック)を組み合わせて実行するだけの薄い
// ラッパーのため、ロジック自体のテストはfetchCandidates.test.ts/selection.test.tsで担保済み
// (TDD対象外。tasks.md Task6参照)。GitHub Actions(daily-publish)が日次実行時にこのスクリプトを
// 呼び出す(2026-08改定。当初はClaude Routinesを実行主体とする想定だった。daily-publish/design.md
// 「実行環境の前提」参照)。標準出力は選定結果のJSONのみとし(呼び出し元がそのままパースするため)、
// 実行状況のログはstderrに出す(design.md「ログ」)
//
// 実行方法: YOUTUBE_API_KEY=xxx npx tsx scripts/ai-dev-digest/collect-and-select.ts 2026-08-01
import fs from 'node:fs'
import path from 'node:path'
import { fetchAllCandidates, fetchHttpClient, buildSourceHealthLogLines } from '../../app/ai-dev-digest/lib/fetchCandidates'
import { selectDailyTopics } from '../../app/ai-dev-digest/lib/selection'
import type { WatchlistEntry, Criteria } from '../../app/ai-dev-digest/lib/watchlistTypes'
import type { Article } from '../../app/ai-dev-digest/lib/types'
import watchlistData from '../../content/ai-dev-digest/watchlist.json'
import criteriaData from '../../content/ai-dev-digest/criteria.json'

const watchlist = watchlistData as WatchlistEntry[]
// criteria.jsonのimportはduplicateSuppressionSourceTypesがstring[]と推論されるため、
// SourceType[]を要求するCriteria型へ明示的にアサートする(watchlist行と同じ扱い)
const criteria = criteriaData as Criteria

const ARTICLES_DIR = path.join(process.cwd(), 'content/ai-dev-digest/articles')

// 掲載済み記事の元URLを全記事から集める(期間で絞らず全件。design.md「掲載済み記事を除外する処理」手順1)
function collectPublishedSourceUrls(): Set<string> {
  const urls = new Set<string>()
  if (!fs.existsSync(ARTICLES_DIR)) return urls
  for (const file of fs.readdirSync(ARTICLES_DIR)) {
    if (!file.endsWith('.json')) continue
    const article = JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8')) as Article
    for (const topic of article.topics) {
      if (topic.sourceUrl) urls.add(topic.sourceUrl)
    }
  }
  return urls
}

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

  const { candidates, stats, shortBodyExclusions } = await fetchAllCandidates(watchlist, criteria, apiKey, fetchHttpClient)
  // 情報源ごとの取得件数をstderrに記録する(0件・取得失敗はWARN付き。requirements.md#情報源の健全性監視-2、design.md「ログ」)
  console.error('情報源ごとの取得件数:')
  for (const line of buildSourceHealthLogLines(stats)) console.error(`  ${line}`)
  console.error(`情報源からの取得候補数: ${candidates.length}件`)

  // 個人ブログの本文量による除外を件数・元URL付きでstderrに記録する(design.md「ログ」)
  if (shortBodyExclusions.length > 0) {
    console.error(`本文量により除外した個人ブログ投稿: ${shortBodyExclusions.length}件`)
    for (const e of shortBodyExclusions) {
      console.error(`  - ${e.sourceName}: ${e.url}(本文${e.bodyChars}字 < 基準${criteria.minIndividualBlogBodyChars}字)`)
    }
  }

  const publishedUrls = collectPublishedSourceUrls()
  console.error(`掲載済み記事の元URL: ${publishedUrls.size}件(当日の候補から除外対象)`)

  const result = selectDailyTopics(candidates, criteria, publishedUrls)
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
