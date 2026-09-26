// 収集+選定のCLI化(仕様: design.md「関連するファイル(抜粋)」)。TDD対象外
// (fetchFixedListCandidates/collectWebSearchCandidates/selectionの薄い呼び出しのみのため。
// ロジック自体はTask3〜7でテスト済み。tasks.md Task8参照)。GitHub Actions(weekly-publish)が
// 火曜(エンタメ編)・金曜(カルチャー・ライフスタイル編)の実行時にこのスクリプトを呼び出す。
// 標準出力は選定結果(SelectionResult)のJSONのみとし、実行状況のログはstderrに出す(design.md「ログ」)
//
// 実行方法: npx tsx scripts/trend-digest/collect-and-select.ts <entertainment|culture-lifestyle>
import fs from 'node:fs'
import path from 'node:path'
import { fetchFixedListGenreCandidates } from '../../app/trend-digest/lib/fetchFixedListCandidates'
import { collectWebSearchGenre } from './collect-websearch-candidates'
import { fetchSourcePage } from './fetchSourcePage'
import {
  excludeAlreadyPublishedTopics,
  narrowGenreCandidates,
  selectEditionTopics,
  normalizeTitle,
} from '../../app/trend-digest/lib/selection'
import type { GenreCandidateEntry } from '../../app/trend-digest/lib/selection'
import { buildHealthLogLines } from '../../app/trend-digest/lib/sourceHealthLog'
import type { SourceCollectionStat } from '../../app/trend-digest/lib/sourceHealthLog'
import type { Candidate } from '../../app/trend-digest/lib/candidateTypes'
import type { WatchlistEntry, Criteria } from '../../app/trend-digest/lib/watchlistTypes'
import type { Article, Edition } from '../../app/trend-digest/lib/types'
import watchlistData from '../../content/trend-digest/watchlist.json'
import criteriaData from '../../content/trend-digest/criteria.json'

const watchlist = watchlistData.genres as WatchlistEntry[]
const criteria = criteriaData as Criteria

const ARTICLES_DIR = path.join(process.cwd(), 'content/trend-digest/articles')

function readAllArticles(): Article[] {
  if (!fs.existsSync(ARTICLES_DIR)) return []
  return fs
    .readdirSync(ARTICLES_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf8')) as Article)
}

// 掲載済み話題の再掲抑制用に、全記事の全トピックのsourceTitleを集める(期間で絞らない。
// design.md「掲載済み話題を除外する処理」手順1)
function collectAllPublishedTitles(articles: Article[]): Set<string> {
  const titles = new Set<string>()
  for (const article of articles) {
    for (const topic of article.topics) titles.add(topic.sourceTitle)
  }
  return titles
}

// 新規ランクイン判定用に、直近newEntryLookbackWeeks週間分の過去記事の掲載トピックのsourceTitle
// (正規化後)を集める(design.md「固定リストジャンルの候補を収集・判定する処理」手順2)
function collectRecentPublishedNormalizedTitles(articles: Article[], weeks: number): Set<string> {
  const cutoff = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000
  const titles = new Set<string>()
  for (const article of articles) {
    if (new Date(article.date).getTime() < cutoff) continue
    for (const topic of article.topics) titles.add(normalizeTitle(topic.sourceTitle))
  }
  return titles
}

async function main() {
  const edition = process.argv[2] as Edition
  if (edition !== 'entertainment' && edition !== 'culture-lifestyle') {
    console.error('使い方: collect-and-select.ts <entertainment|culture-lifestyle>')
    process.exit(1)
  }

  const orderedEntries = watchlist.filter((entry) => entry.edition === edition)
  const articles = readAllArticles()
  const allPublishedTitles = collectAllPublishedTitles(articles)
  const recentPublishedNormalizedTitles = collectRecentPublishedNormalizedTitles(articles, criteria.newEntryLookbackWeeks)

  const genreEntries: GenreCandidateEntry[] = []
  const stats: SourceCollectionStat[] = []
  let excludedAsAlreadyPublished = 0

  for (const entry of orderedEntries) {
    const genreCriteria = criteria.genreCriteria[entry.genre]
    let candidates: Candidate[] = []

    if (entry.method === 'fixed-list' && genreCriteria.method === 'fixed-list') {
      const { candidates: fetched, stats: sourceStats } = await fetchFixedListGenreCandidates(
        entry,
        genreCriteria,
        recentPublishedNormalizedTitles,
        fetchSourcePage
      )
      candidates = fetched
      for (const s of sourceStats) {
        stats.push({ label: `${entry.label} / ${s.sourceName}`, ok: s.ok, count: s.count })
      }
    } else {
      const { candidates: fetched, ok, detail } = await collectWebSearchGenre(entry)
      candidates = fetched
      if (!ok) console.error(`${entry.label}: 検索・判定に失敗しました(候補0件として扱います): ${detail}`)
      stats.push({ label: entry.label, ok, count: fetched.length })
    }

    const unpublished = excludeAlreadyPublishedTopics(candidates, allPublishedTitles)
    excludedAsAlreadyPublished += candidates.length - unpublished.length
    const narrowed = narrowGenreCandidates(unpublished, criteria.perGenreMax)
    genreEntries.push({ genre: entry.genre, method: entry.method, candidates: narrowed })
  }

  // 情報源・ジャンルごとの取得件数をstderrに記録する(0件・取得失敗はWARN付き。
  // requirements.md#情報源の健全性監視-1、design.md「ログ」)
  console.error('ジャンル・情報源ごとの取得件数:')
  for (const line of buildHealthLogLines(stats)) console.error(`  ${line}`)

  // 絞り込みの過程が追えるよう、掲載済み話題として除外した件数を記録する(design.md「ログ」)
  console.error(`掲載済み話題として除外した候補数: ${excludedAsAlreadyPublished}件`)

  const totalRemaining = genreEntries.reduce((sum, e) => sum + e.candidates.length, 0)
  console.error(`絞り込み後の候補数: ${totalRemaining}件`)

  const result = selectEditionTopics(genreEntries, criteria, edition)
  if (result.status === 'skipped') {
    console.error(`候補不足によりスキップします: ${result.reason}`)
  } else {
    console.error(`選定件数: ${result.topics.length}件`)
  }

  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
