import type { Edition, Genre } from './types'
import { GENRE_ORDER } from './types'
import type { HistoryCriteria, Observation } from './historyTypes'
import { readObservationLogs } from './historySchema'
import { aggregateHistory } from './aggregateHistory'
import { judgeDurationLabel } from './judgeDurationLabel'
import { normalizeTitle } from './selection'
import { readArticlesSince } from './reviewRecords'

// 観測ログからの継続度ラベル再集計・地域不明率の集計(仕様: source-review/requirements.md#選定領域の
// 見直し案の粒度・提示方法-9〜10、source-review/design.md「見直しの材料を集める処理」手順3)。
// 標準エラー出力のログ(実行時にしか残らない)ではなく、蓄積され続ける観測ログ・記事データから
// 集計し直す。継続度ラベルの判定はtrend-historyのaggregateHistory・judgeDurationLabelをそのまま
// 再利用し、判定ロジックを二重に持たない(source-review/tasks.md Task2b)

const ALL_GENRES: Genre[] = [...GENRE_ORDER.entertainment, ...GENRE_ORDER['culture-lifestyle']]

export type GenreHistoryReviewStat = {
  genre: Genre
  // そのジャンルで採用基準を満たした観測が1件以上あった回のうち、実際に掲載した話題の継続度
  // ラベルが「流行前」だった回数(requirements.md#選定領域の見直し案の粒度・提示方法-9)
  preTrendDespiteCandidatesRounds: number
  // 集計期間(sinceDate以降)の観測のうち、発祥地域・主な流行地域がともに「不明」(null・空配列)
  // のまま記録された割合。観測が0件のジャンルは0とする(requirements.md#選定領域の見直し案の
  // 粒度・提示方法-10)
  regionUnknownRatio: number
  // regionUnknownRatioの分母(判断材料としての参考値。0件と「常に判明」を区別できるようにする)
  regionObservationCount: number
}

function isRegionUnknown(observation: Pick<Observation, 'originRegion' | 'currentRegions'>): boolean {
  return observation.originRegion === null && observation.currentRegions.length === 0
}

function logKey(date: string, edition: Edition): string {
  return `${date}|${edition}`
}

export function computeGenreHistoryReviewStats(
  historyDir: string,
  articlesDir: string,
  sinceDate: string,
  criteria: HistoryCriteria
): GenreHistoryReviewStat[] {
  const logs = readObservationLogs(historyDir, criteria.maxObservationsPerSource)
  const logsByRound = new Map(logs.map((log) => [logKey(log.date, log.edition), log]))

  // 手順3前段: 採用基準を満たした観測が1件以上あるのに、掲載した話題の継続度ラベルが
  // 「流行前」だった回をジャンルごとに数える。観測ログには採用基準を満たさなかった項目も
  // 入るため、観測ログが非空であることを「候補が収集できている」と読み替えてはいけない
  const preTrendCounts = new Map<Genre, number>()
  const articles = readArticlesSince(articlesDir, sinceDate)
  for (const article of articles) {
    const log = logsByRound.get(logKey(article.date, article.edition))
    if (!log) continue // その回の観測ログが見つからない(欠測)場合は判定材料がないため対象外

    for (const topic of article.topics) {
      const meetsAny = log.observations.some((o) => o.genre === topic.genre && o.meetsCriteria)
      if (!meetsAny) continue

      // 将来の観測を混ぜるとcontinuationDaysが本来より長くなるため、その回の実行日までの
      // 観測ログだけで当時の判定を再現する(design.md「見直しの材料を集める処理」手順3)
      const logsUpToRound = logs.filter((l) => l.date <= article.date)
      const historiesAsOfRound = aggregateHistory(logsUpToRound)
      const match = historiesAsOfRound.find((h) => h.normalizedTitle === normalizeTitle(topic.sourceTitle))
      if (!match) continue // 突合できない(データ不整合)場合は対象外

      const durationLabel = judgeDurationLabel(match.continuationDays, criteria)
      if (durationLabel === 'pre-trend') {
        preTrendCounts.set(topic.genre, (preTrendCounts.get(topic.genre) ?? 0) + 1)
      }
    }
  }

  // 手順3後段: 集計期間(sinceDate以降)の観測のうち、地域情報が不明だった割合をジャンルごとに算出する
  const regionTotal = new Map<Genre, number>()
  const regionUnknown = new Map<Genre, number>()
  for (const log of logs) {
    if (log.date < sinceDate) continue
    for (const observation of log.observations) {
      regionTotal.set(observation.genre, (regionTotal.get(observation.genre) ?? 0) + 1)
      if (isRegionUnknown(observation)) {
        regionUnknown.set(observation.genre, (regionUnknown.get(observation.genre) ?? 0) + 1)
      }
    }
  }

  return ALL_GENRES.map((genre) => {
    const total = regionTotal.get(genre) ?? 0
    const unknown = regionUnknown.get(genre) ?? 0
    return {
      genre,
      preTrendDespiteCandidatesRounds: preTrendCounts.get(genre) ?? 0,
      regionUnknownRatio: total > 0 ? unknown / total : 0,
      regionObservationCount: total,
    }
  })
}
