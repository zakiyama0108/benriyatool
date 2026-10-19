import type { Edition } from './types'
import type { CandidateHistory, Observation, ObservationLog } from './historyTypes'
import { normalizeTitle } from './selection'

// 全観測ログを話題ごとの系列に集約する処理(仕様: design.md「履歴を話題ごとの系列に集約する処理」
// 「途切れずに続いている期間を求める処理」)。入出力が純粋なデータのみのため、
// ファイル入出力を伴わずvitestで完全にテストできる(design.md「関連するファイル(抜粋)」)

// 1件の観測に、それが記録された実行日・編を添えたもの(集約処理の内部でのみ使う)
type DatedObservation = Observation & { date: string; edition: Edition }

// 編の並び順(observedEditionsの決定・表示の安定のため固定順で扱う)
const EDITION_ORDER: Edition[] = ['entertainment', 'culture-lifestyle']

function daysBetween(laterDate: string, earlierDate: string): number {
  const [ly, lm, ld] = laterDate.split('-').map(Number)
  const [ey, em, ed] = earlierDate.split('-').map(Number)
  const later = Date.UTC(ly, lm - 1, ld)
  const earlier = Date.UTC(ey, em - 1, ed)
  return Math.round((later - earlier) / (24 * 60 * 60 * 1000))
}

// 編ごとの「実行の並び」(その編の観測ログが存在する実行日の昇順一覧)を作る
// (design.md「途切れずに続いている期間を求める処理」手順1。欠測週はここに現れない)
function buildEditionRunDates(logs: ObservationLog[]): Map<Edition, string[]> {
  const dates = new Map<Edition, Set<string>>()
  for (const l of logs) {
    if (!dates.has(l.edition)) dates.set(l.edition, new Set())
    dates.get(l.edition)!.add(l.date)
  }
  const result = new Map<Edition, string[]>()
  for (const [edition, set] of dates) {
    result.set(edition, [...set].sort())
  }
  return result
}

// 1つの編について、その話題の継続の開始日を求める(design.md「途切れずに続いている期間を求める処理」手順2)。
// 直近検知日にあたる実行から実行の並びを1つずつ古い方へたどり、観測がない実行に当たったら止める
function continuationStartForEdition(editionRunDates: string[], detectionDatesInEdition: Set<string>): string {
  const lastDetected = [...detectionDatesInEdition].sort().at(-1)!
  let idx = editionRunDates.indexOf(lastDetected)
  while (idx > 0 && detectionDatesInEdition.has(editionRunDates[idx - 1])) idx--
  return editionRunDates[idx]
}

export function aggregateHistory(logs: ObservationLog[]): CandidateHistory[] {
  const editionRunDates = buildEditionRunDates(logs)

  // 正規化タイトルごとに、それが記録された全観測(実行日・編付き)をまとめる
  // (design.md手順2。ジャンルはキーに含めない。requirements.md#機能要件-4)
  const groups = new Map<string, DatedObservation[]>()
  for (const l of logs) {
    for (const obs of l.observations) {
      const key = normalizeTitle(obs.title)
      const dated: DatedObservation = { ...obs, date: l.date, edition: l.edition }
      const group = groups.get(key)
      if (group) group.push(dated)
      else groups.set(key, [dated])
    }
  }

  const histories: CandidateHistory[] = []
  for (const [normalizedTitle, detections] of groups) {
    const sorted = [...detections].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    const firstDetectedDate = sorted[0].date
    const lastDetectedDate = sorted.at(-1)!.date

    // 検知した実行回数は選定方式・編をまたいで通算する(同じ回に両方式で観測された場合は1回。design.md手順3)
    const detectionCount = new Set(sorted.map((d) => d.date)).size

    // 直近の観測: 直近検知日の観測のうち、順位を持つ固定リストジャンルの観測を優先する(design.md手順4)
    const latestCandidates = sorted.filter((d) => d.date === lastDetectedDate)
    const latestDetection = latestCandidates.find((d) => d.rank !== null) ?? latestCandidates[0]

    // 発祥地域は最も古い観測で判定できた値を優先する(design.md手順6)
    const originRegion = sorted.find((d) => d.originRegion !== null)?.originRegion ?? null

    // 話題が観測された編の一覧(design.md手順7)
    const observedEditionSet = new Set(sorted.map((d) => d.edition))
    const observedEditions = EDITION_ORDER.filter((e) => observedEditionSet.has(e))

    // 途切れずに続いている期間(design.md「途切れずに続いている期間を求める処理」)。
    // 編ごとに継続の開始日を求め、複数編で観測される話題は最も古いものを採る(手順3)
    const startDatesByEdition = observedEditions.map((edition) => {
      const runDates = editionRunDates.get(edition) ?? []
      const detectionDatesInEdition = new Set(sorted.filter((d) => d.edition === edition).map((d) => d.date))
      return continuationStartForEdition(runDates, detectionDatesInEdition)
    })
    const continuationStartDate = startDatesByEdition.sort()[0]
    const continuationDays = daysBetween(lastDetectedDate, continuationStartDate)

    histories.push({
      normalizedTitle,
      latestTitle: latestDetection.title,
      latestGenre: latestDetection.genre,
      latestMethod: latestDetection.method,
      latestStrength: latestDetection.strength,
      latestRank: latestDetection.rank,
      firstDetectedDate,
      lastDetectedDate,
      continuationStartDate,
      continuationDays,
      detectionCount,
      observedEditions,
      originRegion,
      currentRegions: latestDetection.currentRegions,
      strengthJapan: latestDetection.strengthJapan,
      strengthOverseas: latestDetection.strengthOverseas,
    })
  }

  return histories.sort((a, b) => a.normalizedTitle.localeCompare(b.normalizedTitle))
}
