// 収集+選定のCLI化(仕様: design.md「関連するファイル(抜粋)」、trend-history/design.md「処理フロー」)。
// collectGenreObservationsのhybrid分岐(併用ジャンルで固定リスト側・WebSearch側の両方を呼び出し
// 結合する部分)はtasks.md Task16でテスト対象とする。それ以外(main()自体)はTDD対象外
// (fetchFixedListCandidates/collectWebSearchCandidates/selectionの薄い呼び出しのみのため。
// ロジック自体はTask6〜7・trend-history/tasks.md Task2〜8でテスト済み)。GitHub Actions
// (weekly-publish)が火曜(エンタメ編)・金曜(カルチャー・ライフスタイル編)の実行時にこのスクリプトを呼び出す。
//
// 対象editionの全ジャンルの観測項目(採用基準の判定前の全件)を集めたら、その回の観測ログを
// content/trend-digest/history/配下へ書き出し(trend-history/design.md「その回の観測を履歴に記録する処理」)、
// 全観測ログから話題ごとの継続度・注目度ラベル・掲載実績を判定し(同design.md「処理フロー」)、
// 掲載する話題を選ぶ(selectEditionTopics)。標準出力はその選定結果(SelectionResult)とし、
// scripts/trend-digest/generate-content.tsがこれを読んで見出し・本文を生成する
//
// 実行方法: npx tsx scripts/trend-digest/collect-and-select.ts <entertainment|culture-lifestyle>
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { fetchFixedListGenreCandidates } from '../../app/trend-digest/lib/fetchFixedListCandidates'
import type { SourceFetchStat } from '../../app/trend-digest/lib/fetchFixedListCandidates'
import { collectWebSearchGenre } from './collect-websearch-candidates'
import { dispatchFixedListSource } from './fetchSourcePage'
import { normalizeTitle, selectEditionTopics } from '../../app/trend-digest/lib/selection'
import type { GenreObservations, JudgementLookup } from '../../app/trend-digest/lib/selection'
import { buildHealthLogLines, buildSelectionLogLines } from '../../app/trend-digest/lib/sourceHealthLog'
import type { SourceCollectionStat, GenreSelectionLog } from '../../app/trend-digest/lib/sourceHealthLog'
import type { Candidate } from '../../app/trend-digest/lib/candidateTypes'
import type { WatchlistEntry, Criteria, GenreCriteria, FixedListGenreCriteria } from '../../app/trend-digest/lib/watchlistTypes'
import type { Edition, Genre } from '../../app/trend-digest/lib/types'
import { readAllArticles, collectRecentPublishedNormalizedTitles } from './readArticles'
import { writeObservationLog } from '../../app/trend-digest/lib/writeObservationLog'
import { readObservationLogs } from '../../app/trend-digest/lib/historySchema'
import { aggregateHistory } from '../../app/trend-digest/lib/aggregateHistory'
import { judgeDurationLabel } from '../../app/trend-digest/lib/judgeDurationLabel'
import { judgeHeatLabel, buildGenreHeatStats } from '../../app/trend-digest/lib/judgeHeatLabel'
import { collectPublishRecords, lookupPublishRecord } from '../../app/trend-digest/lib/publishRecords'
import { buildHistoryLogLines } from '../../app/trend-digest/lib/historyLog'
import watchlistData from '../../content/trend-digest/watchlist.json'
import criteriaData from '../../content/trend-digest/criteria.json'

const watchlist = watchlistData.genres as WatchlistEntry[]
const criteria = criteriaData as Criteria
const HISTORY_DIR = path.join(process.cwd(), 'content/trend-digest/history')
const ARTICLES_DIR = path.join(process.cwd(), 'content/trend-digest/articles')

// 対象editionの1ジャンル分の観測項目(design.md「候補の型(前提)」GenreObservationsと同じ形)
type GenreObservationsOutput = {
  genre: WatchlistEntry['genre']
  label: string
  observations: Candidate[]
}

// 固定リストジャンル側の観測項目を取得する関数。実際のHTTP通信(dispatchFixedListSource)は
// mainが注入する(テストではモックを渡す)
export type FixedListFetcher = (
  entry: WatchlistEntry,
  criteria: FixedListGenreCriteria
) => Promise<{ observations: Candidate[]; stats: SourceFetchStat[] }>

// WebSearchジャンル側の観測項目を取得する関数。collectWebSearchGenre(criteriaの解決を含む)を
// そのまま注入する(テストではモックを渡す)
export type WebSearchFetcher = (
  entry: WatchlistEntry
) => Promise<{ observations: Candidate[]; ok: boolean; detail?: string }>

function statsFromFixedList(label: string, sourceStats: SourceFetchStat[]): SourceCollectionStat[] {
  return sourceStats.map((s) => ({
    label: `${label} / ${s.sourceName}`,
    ok: s.ok,
    observationCount: s.observationCount,
    candidateCount: s.candidateCount,
  }))
}

function statsFromWebSearch(
  label: string,
  result: { observations: Candidate[]; ok: boolean }
): SourceCollectionStat[] {
  const candidateCount = result.observations.filter((o) => o.meetsCriteria).length
  return [{ label, ok: result.ok, observationCount: result.observations.length, candidateCount }]
}

// 1ジャンル分の観測項目を収集する(design.md「固定リストジャンルの候補を収集・判定する処理」
// 「WebSearchジャンルの候補を収集・判定する処理」「併用ジャンル(アニメ)の候補を収集・判定する処理」)。
// method: 'hybrid'のジャンルは、固定リスト側(genreCriteria.fixedList)・WebSearch側
// (collectWebSearchGenreがgenreCriteria.webSearchを解決する)の両方を呼び出し、観測項目を
// 1つの配列に結合する(いずれか一方が0件・取得失敗でも他方の観測は残す。requirements.md#選定方式-7)
export async function collectGenreObservations(
  entry: WatchlistEntry,
  genreCriteria: GenreCriteria,
  fetchFixedList: FixedListFetcher,
  fetchWebSearch: WebSearchFetcher
): Promise<{ observations: Candidate[]; stats: SourceCollectionStat[] }> {
  if (entry.method === 'hybrid' && genreCriteria.method === 'hybrid') {
    const fixedListCriteria: FixedListGenreCriteria = { method: 'fixed-list', ...genreCriteria.fixedList }
    const [fixedResult, webResult] = await Promise.all([fetchFixedList(entry, fixedListCriteria), fetchWebSearch(entry)])
    if (!webResult.ok) {
      console.error(`${entry.label}(WebSearch側): 検索・判定に失敗しました(観測項目0件として扱います): ${webResult.detail}`)
    }
    return {
      observations: [...fixedResult.observations, ...webResult.observations],
      stats: [...statsFromFixedList(entry.label, fixedResult.stats), ...statsFromWebSearch(`${entry.label}(WebSearch)`, webResult)],
    }
  }

  if (entry.method === 'fixed-list' && genreCriteria.method === 'fixed-list') {
    const { observations, stats: sourceStats } = await fetchFixedList(entry, genreCriteria)
    return { observations, stats: statsFromFixedList(entry.label, sourceStats) }
  }

  // method: 'websearch'。collectWebSearchGenreがcriteriaの解決を行うため、ここではgenreCriteriaを使わない
  const webResult = await fetchWebSearch(entry)
  if (!webResult.ok) console.error(`${entry.label}: 検索・判定に失敗しました(観測項目0件として扱います): ${webResult.detail}`)
  return { observations: webResult.observations, stats: statsFromWebSearch(entry.label, webResult) }
}

async function main() {
  const edition = process.argv[2] as Edition
  if (edition !== 'entertainment' && edition !== 'culture-lifestyle') {
    console.error('使い方: collect-and-select.ts <entertainment|culture-lifestyle>')
    process.exit(1)
  }

  const orderedEntries = watchlist.filter((entry) => entry.edition === edition)
  const articles = readAllArticles()
  const recentPublishedNormalizedTitles = collectRecentPublishedNormalizedTitles(
    articles,
    criteria.newEntryLookbackWeeks,
    normalizeTitle
  )

  const fetchFixedList: FixedListFetcher = (entry, fixedListCriteria) =>
    fetchFixedListGenreCandidates(
      entry,
      fixedListCriteria,
      recentPublishedNormalizedTitles,
      (source) => dispatchFixedListSource(source, entry.genre),
      criteria.history.maxObservationsPerSource
    )

  const genreObservations: GenreObservationsOutput[] = []
  const stats: SourceCollectionStat[] = []

  for (const entry of orderedEntries) {
    const genreCriteria = criteria.genreCriteria[entry.genre]
    const { observations, stats: entryStats } = await collectGenreObservations(
      entry,
      genreCriteria,
      fetchFixedList,
      collectWebSearchGenre
    )
    genreObservations.push({ genre: entry.genre, label: entry.label, observations })
    stats.push(...entryStats)
  }

  // 情報源・ジャンルごとの観測項目数・候補件数をstderrに記録する(候補件数が0件のものはWARN付き。
  // requirements.md#情報源の健全性監視-1、design.md「ログ」)
  console.error('ジャンル・情報源ごとの観測項目数・候補件数:')
  for (const line of buildHealthLogLines(stats)) console.error(`  ${line}`)

  const totalObservations = genreObservations.reduce((sum, g) => sum + g.observations.length, 0)
  console.error(`観測項目数(全ジャンル合計): ${totalObservations}件`)
  if (totalObservations === 0) {
    // 対象editionの全ジャンルで項目を1件も取得できなかった場合(requirements.md#情報源の健全性監視-1、
    // design.md「ログ」)。0件でも観測ログ自体は書き出す(trend-history/design.md「履歴データの形式」)
    console.error(`WARN 対象edition(${edition})の全ジャンルで情報源から観測項目を1件も取得できませんでした`)
  }

  const date = new Date().toISOString().slice(0, 10)

  // その回の観測(採用基準の判定前の全件)を履歴ログへ書き出す(trend-history/design.md「その回の観測を
  // 履歴に記録する処理」)。書き出しに失敗した場合はここで例外が投げられ、記事を生成せず週次実行を
  // 失敗させる(同design.md「エラーハンドリング」。main().catchが非ゼロ終了させる)
  const allObservationsThisRun = genreObservations.flatMap((g) => g.observations)
  const writtenLog = writeObservationLog(HISTORY_DIR, date, edition, allObservationsThisRun, criteria.history.maxObservationsPerSource)

  // 全観測ログ(今回書き出した分を含む)を読み込み、話題ごとの系列に集約してラベルを判定する
  // (trend-history/design.md「処理フロー」)
  const logs = readObservationLogs(HISTORY_DIR, criteria.history.maxObservationsPerSource)
  const histories = aggregateHistory(logs)
  const genreHeatStats = buildGenreHeatStats(logs)
  const publishRecords = collectPublishRecords(ARTICLES_DIR)

  const judgements: JudgementLookup = new Map()
  const durationLabelCounts: Record<string, number> = {}
  const heatLabelCounts: Record<string, number> = {}
  const heatBasisByGenre = new Map<Genre, Set<'distribution' | 'source-position'>>()
  let unknownOriginRegionCount = 0

  for (const history of histories) {
    const durationLabel = judgeDurationLabel(history.continuationDays, criteria.history)
    const genreStats = genreHeatStats.get(history.latestGenre) ?? { runCount: 0, strengths: [] }
    const heat = judgeHeatLabel({ rank: history.latestRank, strength: history.latestStrength }, genreStats, criteria.history)
    const publishRecord = lookupPublishRecord(publishRecords, history.normalizedTitle)

    judgements.set(history.normalizedTitle, {
      durationLabel,
      heatLabel: heat.label,
      heatBasis: heat.basis,
      continuationDays: history.continuationDays,
      continuationStartDate: history.continuationStartDate,
      detectionCount: history.detectionCount,
      publishedCount: publishRecord.publishedCount,
      reportCount: publishRecord.reportCount,
      lastPublishedDurationLabel: publishRecord.lastPublishedDurationLabel,
    })

    durationLabelCounts[durationLabel] = (durationLabelCounts[durationLabel] ?? 0) + 1
    heatLabelCounts[heat.label] = (heatLabelCounts[heat.label] ?? 0) + 1
    if (!heatBasisByGenre.has(history.latestGenre)) heatBasisByGenre.set(history.latestGenre, new Set())
    heatBasisByGenre.get(history.latestGenre)!.add(heat.basis)
    if (history.originRegion === null) unknownOriginRegionCount++
  }

  // 観測ログの書き出し件数・判定結果のラベル分布・注目度の判定方法・地域不明件数を記録する
  // (requirements.md#注目度ラベル-11、trend-history/design.md「ログ」。分布の偏り・慢性的な
  // 地域不明をsource-reviewの月次見直しで拾うため)
  for (const line of buildHistoryLogLines({
    date,
    edition,
    writtenObservationCount: writtenLog.observations.length,
    durationLabelCounts,
    heatLabelCounts,
    heatBasisByGenre,
    unknownOriginRegionCount,
  })) {
    console.error(line)
  }

  // 各ジャンルから掲載する話題を選ぶ(content-selection/design.md「掲載する話題を選ぶ処理」)
  const genreObservationsForSelection: GenreObservations[] = genreObservations.map((g) => ({
    genre: g.genre,
    observations: g.observations,
  }))
  const selectionResult = selectEditionTopics(genreObservationsForSelection, judgements, edition)

  if (selectionResult.status === 'ok') {
    // 掲載する話題を候補から選んだか、採用基準に届かなかった観測項目から選んだか、選んだ話題の
    // 継続度ラベル・注目度ラベル・報告回数を記録する(requirements.md#情報源の健全性監視-2)
    const selectionLogs: GenreSelectionLog[] = selectionResult.topics.map((topic) => ({
      label: watchlist.find((entry) => entry.genre === topic.genre)?.label ?? topic.genre,
      pickedFromCandidates: topic.meetsCriteria,
      durationLabel: topic.durationLabel,
      heatLabel: topic.heatLabel,
      reportCount: topic.reportCount,
    }))
    console.error('ジャンルごとの選定結果:')
    for (const line of buildSelectionLogLines(selectionLogs)) console.error(`  ${line}`)
  }

  process.stdout.write(JSON.stringify(selectionResult, null, 2) + '\n')
}

// CLIとして直接実行されたときだけmain()を走らせる(テストからcollectGenreObservationsを
// importした際に、モジュール読み込みの副作用でCLIが起動してしまわないようにするため。
// scripts/trend-digest/broadcast-line.tsの既存パターンと同じ)
const isMainModule = process.argv[1] != null && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMainModule) {
  main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
