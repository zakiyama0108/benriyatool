// 収集+選定のCLI化(仕様: design.md「関連するファイル(抜粋)」)。collectGenreObservationsの
// hybrid分岐(併用ジャンルで固定リスト側・WebSearch側の両方を呼び出し結合する部分)は
// tasks.md Task16でテスト対象とする。それ以外(main()自体)はTDD対象外
// (fetchFixedListCandidates/collectWebSearchCandidates/selectionの薄い呼び出しのみのため。
// ロジック自体はTask6〜7でテスト済み。tasks.md Task8参照)。GitHub Actions(weekly-publish)が
// 火曜(エンタメ編)・金曜(カルチャー・ライフスタイル編)の実行時にこのスクリプトを呼び出す。
//
// content-selectionの責務は「対象editionの全ジャンルの観測項目(採用基準の判定前の全件)を集める」
// までであり、標準出力はその収集結果(ObservationLog相当のJSON)のみとする。観測ログへの書き出し・
// 継続度/注目度ラベルの判定・selectEditionTopicsの呼び出しはtrend-history実装時にこのファイルへ
// 追加される(trend-history/design.md「関連するファイル」参照。この時点ではhistoryTypes.ts以外の
// trend-history実装ファイルが存在しないため、本specの範囲ではここまでで処理を止める)
//
// 実行方法: npx tsx scripts/trend-digest/collect-and-select.ts <entertainment|culture-lifestyle>
import { pathToFileURL } from 'node:url'
import { fetchFixedListGenreCandidates } from '../../app/trend-digest/lib/fetchFixedListCandidates'
import type { SourceFetchStat } from '../../app/trend-digest/lib/fetchFixedListCandidates'
import { collectWebSearchGenre } from './collect-websearch-candidates'
import { dispatchFixedListSource } from './fetchSourcePage'
import { normalizeTitle } from '../../app/trend-digest/lib/selection'
import { buildHealthLogLines } from '../../app/trend-digest/lib/sourceHealthLog'
import type { SourceCollectionStat } from '../../app/trend-digest/lib/sourceHealthLog'
import type { Candidate } from '../../app/trend-digest/lib/candidateTypes'
import type { WatchlistEntry, Criteria, GenreCriteria, FixedListGenreCriteria } from '../../app/trend-digest/lib/watchlistTypes'
import type { Edition } from '../../app/trend-digest/lib/types'
import { readAllArticles, collectRecentPublishedNormalizedTitles } from './readArticles'
import watchlistData from '../../content/trend-digest/watchlist.json'
import criteriaData from '../../content/trend-digest/criteria.json'

const watchlist = watchlistData.genres as WatchlistEntry[]
const criteria = criteriaData as Criteria

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
    // design.md「ログ」)。weekly-publish側はこの旨と標準出力のJSONを見て「取得できずスキップ」の判断に使う
    console.error(`WARN 対象edition(${edition})の全ジャンルで情報源から観測項目を1件も取得できませんでした`)
  }

  // 掲載する話題を候補から選んだか、採用基準に届かなかった観測項目から選んだか、選んだ話題の
  // 継続度ラベル・注目度ラベル・報告回数の記録(requirements.md#情報源の健全性監視-2)は、
  // trend-historyの判定結果(継続度・注目度ラベル)が確定してから行う。この時点ではまだ
  // selectEditionTopicsを呼び出せないため(historyTypes.ts以外のtrend-history実装ファイルが
  // 存在しない)、trend-history実装時にsourceHealthLog.tsのbuildSelectionLogLinesを使って
  // このファイルへ追加する

  const date = new Date().toISOString().slice(0, 10)
  process.stdout.write(JSON.stringify({ date, edition, genres: genreObservations }, null, 2) + '\n')
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
