import type { WatchlistEntry, FixedListGenreCriteria } from './watchlistTypes'
import type { Candidate } from './candidateTypes'
import { normalizeTitle } from './selection'

// 固定リストジャンルの候補収集・判定(仕様: requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1〜9、
// requirements.md#データ取得方法-1、design.md「固定リストジャンルの候補を収集・判定する処理」)。
// 外部ページへのHTTP呼び出しを伴うため、レスポンス形状のパース・エラー処理のみをモックしたテストの
// 対象とする(design.md「関連するファイル(抜粋)」参照)。実際のHTTP通信・format別のディスパッチ
// (site-specific-html→sourceParsers/、structured-*→fetchStructuredSource.ts)はscripts側が
// 注入するSourceFetcherが担う(scripts/trend-digest/fetchSourcePage.tsのdispatchFixedListSource)

// 情報源から取得した順位付き一覧の1件(design.md「固定リストジャンルの候補を収集・判定する処理」手順1)。
// previousRank/isNewは、情報源のページ自体が前週比の順位変動を提供する場合のみ設定される
export type RankedItem = {
  title: string
  currentRank: number
  previousRank?: number
  isNew?: boolean
}

// 情報源1件の取得結果。providesRankChangeは、そのページ自体が前週順位・NEW表記といった
// 前週比データを提供しているか(design.md手順2の判定に使う)
export type SourceFetchResult = {
  providesRankChange: boolean
  items: RankedItem[]
}

// 情報源1件を取得する関数。実際のHTTP通信・パース(format別ディスパッチ)はscripts/trend-digest側が注入する
export type SourceFetcher = (source: WatchlistEntry['sources'][number]) => Promise<SourceFetchResult>

// 情報源1件ぶんの取得件数(design.md「ログ」requirements.md#情報源の健全性監視-1)。
// observationCountは記録上限(maxObservationsPerSource)適用後の観測項目数、
// candidateCountはそのうち採用基準を満たした件数(候補件数)
export type SourceFetchStat = {
  sourceName: string
  sourceUrl: string
  ok: boolean
  observationCount: number
  candidateCount: number
}

// 順位付きランキング型の1件が候補になるかを判定する(design.md手順2〜4)。
// wasPublishedRecentlyは、情報源のページが前週比データを提供しない場合のみ使う
// (直近newEntryLookbackWeeks週間の過去記事に同名タイトルがあるか。呼び出し元が正規化済み集合で判定する)
const NOT_MATCHED = { matched: false, note: '' } as const

// rankThresholdが指定されている場合のみ、現在の順位がその範囲内かを確認する(design.md手順4「両方を満たす」の後段判定)
function withinRankThreshold(item: RankedItem, criteria: FixedListGenreCriteria): boolean {
  return criteria.rankThreshold === undefined || item.currentRank <= criteria.rankThreshold
}

// newEntryOrRisingRank条件(新規ランクイン、または順位上昇)を満たすかを判定する(design.md手順3)
function matchesNewEntryOrRising(
  item: RankedItem,
  providesRankChange: boolean,
  criteria: FixedListGenreCriteria,
  wasPublishedRecently: (normalizedTitle: string) => boolean
): { matched: boolean; note: string } {
  if (!providesRankChange) {
    // 情報源のページが前週比を提供しない: 過去記事の掲載トピックに同名がなければ新規とみなす。
    // 順位上昇の判定は諦める(design.md手順3)
    const isNewEntry = !wasPublishedRecently(normalizeTitle(item.title))
    return isNewEntry ? { matched: true, note: `新規ランクイン(${item.currentRank}位)` } : NOT_MATCHED
  }

  if (item.isNew || item.previousRank === undefined) {
    return { matched: true, note: `新規ランクイン(${item.currentRank}位)` }
  }

  const improvement = item.previousRank - item.currentRank
  const risingMatched =
    criteria.risingRankMinImprovement !== undefined
      ? improvement >= criteria.risingRankMinImprovement
      : improvement > 0
  return risingMatched ? { matched: true, note: `順位上昇(${item.previousRank}位→${item.currentRank}位)` } : NOT_MATCHED
}

// 順位付きランキング型の1件が候補になるかを判定する(design.md手順3〜5)
function judgeRankedItem(
  item: RankedItem,
  providesRankChange: boolean,
  criteria: FixedListGenreCriteria,
  wasPublishedRecently: (normalizedTitle: string) => boolean
): { matched: boolean; note: string } {
  if (criteria.newEntryOrRisingRank) {
    const judged = matchesNewEntryOrRising(item, providesRankChange, criteria, wasPublishedRecently)
    if (!judged.matched) return NOT_MATCHED
    // rankThresholdも指定されているジャンル(books-comics)は、両方を満たす項目のみ候補にする(design.md手順5)
    return withinRankThreshold(item, criteria) ? judged : NOT_MATCHED
  }

  // newEntryOrRisingRankを持たないジャンル: rankThresholdのみで判定する(design.md手順4)
  return withinRankThreshold(item, criteria) ? { matched: true, note: `${item.currentRank}位` } : NOT_MATCHED
}

// 情報源をまたいで同一作品を突き合わせるための、情報源名・URLを添えた1件
type SourceTaggedItem = RankedItem & { sourceName: string; sourceUrl: string; providesRankChange: boolean }

// 1ジャンル分の固定リスト観測項目を収集・判定する(design.md「固定リストジャンルの候補を収集・判定する処理」)。
// 採用基準を満たさなかった項目もmeetsCriteria: falseとして返す(観測項目全件をtrend-historyの履歴へ
// 引き渡すため。requirements.md#機能要件-3〜4)
export async function fetchFixedListGenreCandidates(
  entry: WatchlistEntry,
  criteria: FixedListGenreCriteria,
  recentPublishedNormalizedTitles: Set<string>,
  fetchSource: SourceFetcher,
  maxObservationsPerSource: number
): Promise<{ observations: Candidate[]; stats: SourceFetchStat[] }> {
  const stats: SourceFetchStat[] = []
  const allItems: SourceTaggedItem[] = []
  const wasPublishedRecently = (t: string) => recentPublishedNormalizedTitles.has(t)

  for (const source of entry.sources) {
    let result: SourceFetchResult
    try {
      result = await fetchSource(source)
    } catch {
      // 1情報源の取得失敗で他の情報源の収集を止めない(requirements.md#データ取得方法-1、design.md手順1)
      stats.push({ sourceName: source.name, sourceUrl: source.url, ok: false, observationCount: 0, candidateCount: 0 })
      continue
    }

    // 採用基準の判定を行う前に、上位maxObservationsPerSource件までを「その回の観測」として保持する
    // (design.md手順2)。以降で採用基準を満たさなかった項目も含めてすべて観測項目として返す
    const cappedItems = result.items.slice(0, maxObservationsPerSource)
    // statsのcandidateCountは、この情報源が単独で返した項目のうち採用基準を満たした件数
    // (複数情報源で同じ作品が観測された場合の統合は下記グループ化後に行うため、統合前の値)
    const candidateCount = cappedItems.filter(
      (item) => judgeRankedItem(item, result.providesRankChange, criteria, wasPublishedRecently).matched
    ).length

    for (const item of cappedItems) {
      allItems.push({ ...item, sourceName: source.name, sourceUrl: source.url, providesRankChange: result.providesRankChange })
    }
    stats.push({ sourceName: source.name, sourceUrl: source.url, ok: true, observationCount: cappedItems.length, candidateCount })
  }

  // 複数情報源で同じ作品(正規化タイトルが同一)が観測された場合は1件に統合し、より順位が高い
  // (currentRankが小さい)方の情報源のデータを採用する(design.md手順6。books-comicsのトーハン・
  // 日販等)。採用されなかった方の情報源名・順位は判定根拠のメモに残す
  const groupsByTitle = new Map<string, SourceTaggedItem[]>()
  for (const item of allItems) {
    const key = normalizeTitle(item.title)
    const group = groupsByTitle.get(key)
    if (group) group.push(item)
    else groupsByTitle.set(key, [item])
  }

  const observations: Candidate[] = []
  for (const group of groupsByTitle.values()) {
    const sorted = [...group].sort((a, b) => a.currentRank - b.currentRank)
    const primary = sorted[0]
    const judged = judgeRankedItem(primary, primary.providesRankChange, criteria, wasPublishedRecently)
    const note =
      sorted.length > 1
        ? `${judged.note}(${sorted.map((s) => `${s.sourceName}${s.currentRank}位`).join('・')})`
        : judged.note

    observations.push({
      genre: entry.genre,
      title: primary.title,
      sourceName: primary.sourceName,
      sourceUrl: primary.sourceUrl,
      method: 'fixed-list',
      strength: 100 - primary.currentRank, // design.md手順6。順位が高いほど大きい値
      rank: primary.currentRank, // design.md手順7。strengthからの逆算ではなく順位そのものを持つ
      // 地域情報(originRegion/currentRegions/strengthJapan/strengthOverseas)の集計は
      // trend-historyが情報源のregionから行う(design.md手順8。実装はtrend-history/tasks.mdのTask11)
      originRegion: null,
      currentRegions: [],
      strengthJapan: null,
      strengthOverseas: null,
      meetsCriteria: judged.matched,
      ...(note ? { note } : {}),
    })
  }

  return { observations, stats }
}
