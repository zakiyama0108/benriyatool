import type { WatchlistEntry, FixedListGenreCriteria } from './watchlistTypes'
import type { Candidate } from './candidateTypes'
import { normalizeTitle } from './selection'

// 固定リストジャンルの候補収集・判定(仕様: requirements.md#ジャンルごとの情報源・採用基準(固定リストジャンル)-1〜9、
// requirements.md#データ取得方法-1、design.md「固定リストジャンルの候補を収集・判定する処理」)。
// 外部ページへのHTTP呼び出しを伴うため、レスポンス形状のパース・エラー処理のみをモックしたテストの
// 対象とする(design.md「関連するファイル(抜粋)」参照)。実際のHTTP通信・HTMLパースはscripts側が
// 注入するSourceFetcherが担う

// 情報源から取得した順位付き一覧の1件(design.md「固定リストジャンルの候補を収集・判定する処理」手順1)。
// previousRank/isNewは、情報源のページ自体が前週比の順位変動を提供する場合のみ設定される
export type RankedItem = {
  title: string
  currentRank: number
  previousRank?: number
  isNew?: boolean
}

// 情報源から取得した新着記事一覧の1件(design.md手順1。WWD JAPAN新着記事・Engadget日本版が該当。
// 順位を持たないためcurrentRankを持たない)
export type NewArticleItem = {
  title: string
  publishedAt: string // ISO 8601
}

// 情報源1件の取得結果。providesRankChangeは、そのページ自体が前週順位・NEW表記といった
// 前週比データを提供しているか(design.md手順2の判定に使う)
export type SourceFetchResult =
  | { kind: 'ranked'; providesRankChange: boolean; items: RankedItem[] }
  | { kind: 'new-articles'; items: NewArticleItem[] }

// 情報源1件を取得する関数。実際のHTTP通信・HTMLパースはscripts/trend-digest側が注入する
export type SourceFetcher = (source: { name: string; url: string }) => Promise<SourceFetchResult>

export type SourceFetchStat = { sourceName: string; sourceUrl: string; ok: boolean; count: number }

// 順位付きランキング型の1件が候補になるかを判定する(design.md手順2〜4)。
// wasPublishedRecentlyは、情報源のページが前週比データを提供しない場合のみ使う
// (直近newEntryLookbackWeeks週間の過去記事に同名タイトルがあるか。呼び出し元が正規化済み集合で判定する)
const NOT_MATCHED = { matched: false, note: '' } as const

// rankThresholdが指定されている場合のみ、現在の順位がその範囲内かを確認する(design.md手順4「両方を満たす」の後段判定)
function withinRankThreshold(item: RankedItem, criteria: FixedListGenreCriteria): boolean {
  return criteria.rankThreshold === undefined || item.currentRank <= criteria.rankThreshold
}

// newEntryOrRisingRank条件(新規ランクイン、または順位上昇)を満たすかを判定する(design.md手順2)
function matchesNewEntryOrRising(
  item: RankedItem,
  providesRankChange: boolean,
  criteria: FixedListGenreCriteria,
  wasPublishedRecently: (normalizedTitle: string) => boolean
): { matched: boolean; note: string } {
  if (!providesRankChange) {
    // 情報源のページが前週比を提供しない: 過去記事の掲載トピックに同名がなければ新規とみなす。
    // 順位上昇の判定は諦める(design.md手順2)
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

// 順位付きランキング型の1件が候補になるかを判定する(design.md手順2〜4)
function judgeRankedItem(
  item: RankedItem,
  providesRankChange: boolean,
  criteria: FixedListGenreCriteria,
  wasPublishedRecently: (normalizedTitle: string) => boolean
): { matched: boolean; note: string } {
  if (criteria.newEntryOrRisingRank) {
    const judged = matchesNewEntryOrRising(item, providesRankChange, criteria, wasPublishedRecently)
    if (!judged.matched) return NOT_MATCHED
    // rankThresholdも指定されているジャンル(books-comics)は、両方を満たす項目のみ候補にする(design.md手順4)
    return withinRankThreshold(item, criteria) ? judged : NOT_MATCHED
  }

  // newEntryOrRisingRankを持たないジャンル: rankThresholdのみで判定する(design.md手順3)
  return withinRankThreshold(item, criteria) ? { matched: true, note: `${item.currentRank}位` } : NOT_MATCHED
}

// 1ジャンル分の固定リスト候補を収集・判定する(design.md「固定リストジャンルの候補を収集・判定する処理」)
export async function fetchFixedListGenreCandidates(
  entry: WatchlistEntry,
  criteria: FixedListGenreCriteria,
  recentPublishedNormalizedTitles: Set<string>,
  fetchSource: SourceFetcher
): Promise<{ candidates: Candidate[]; stats: SourceFetchStat[] }> {
  const candidates: Candidate[] = []
  const stats: SourceFetchStat[] = []

  for (const source of entry.sources) {
    let result: SourceFetchResult
    try {
      result = await fetchSource(source)
    } catch {
      // 1情報源の取得失敗で他の情報源の収集を止めない(requirements.md#データ取得方法-1、design.md手順1)
      stats.push({ sourceName: source.name, sourceUrl: source.url, ok: false, count: 0 })
      continue
    }

    if (result.kind === 'ranked') {
      const matchedItems: { title: string; currentRank: number; note: string }[] = []
      for (const item of result.items) {
        const judged = judgeRankedItem(item, result.providesRankChange, criteria, (t) =>
          recentPublishedNormalizedTitles.has(t)
        )
        if (judged.matched) matchedItems.push({ title: item.title, currentRank: item.currentRank, note: judged.note })
      }
      for (const m of matchedItems) {
        candidates.push({
          genre: entry.genre,
          title: m.title,
          sourceName: source.name,
          sourceUrl: source.url,
          method: 'fixed-list',
          strength: 100 - m.currentRank,
          note: m.note,
        })
      }
      stats.push({ sourceName: source.name, sourceUrl: source.url, ok: true, count: matchedItems.length })
    } else {
      // 新着記事一覧型: 順位を持たないため、rankThreshold判定を行わずそのまま候補にする
      // (design.md手順3)。掲載順(配列の並び順)を仮の順位とみなしstrengthを算出する(design.md手順5)
      result.items.forEach((article, index) => {
        candidates.push({
          genre: entry.genre,
          title: article.title,
          sourceName: source.name,
          sourceUrl: source.url,
          method: 'fixed-list',
          strength: 100 - (index + 1),
          note: `新着記事(${article.publishedAt})`,
        })
      })
      stats.push({ sourceName: source.name, sourceUrl: source.url, ok: true, count: result.items.length })
    }
  }

  return { candidates, stats }
}
