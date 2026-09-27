import type { Horizon, Impact } from './types'
import { IMPACT_ORDER } from './types'
import type { Candidate, CollectionFailureReason, SlotResult } from './candidateTypes'
import { normalizeUrl } from './deliveredIndex'

export type CollectionFailedGenre = { genre: string; reason: CollectionFailureReason }

function impactRankValue(impact: Impact): number {
  return IMPACT_ORDER.indexOf(impact)
}

// 枠ごとの採用・候補なしの記録・収集失敗ジャンルの合流(仕様: content-selection/requirements.md#機能要件-3〜5、
// content-selection/requirements.md#影響度-3、content-selection/requirements.md#候補が見つからない枠-1、
// content-selection/requirements.md#収集失敗-1、content-selection/design.md「枠ごとに1本を採用する処理」)。
// ジャンル順・時間軸の近い順(genres・horizonsの引数順)に枠を処理し、同じ回の別の枠で採用済みの
// URLも重複除外の対象にする(手順5「重複除外の結果を毎回同じにするため」)
export function selectSlots(
  candidates: Candidate[],
  genres: string[], // 有効なジャンルのid一覧(genres.json記載順)
  horizons: [Horizon, Horizon], // 今回の時間軸2区分(近い順)
  deliveredUrls: Set<string>,
  collectionFailedGenres: CollectionFailedGenre[],
): SlotResult[] {
  const failedReasonByGenre = new Map(collectionFailedGenres.map((f) => [f.genre, f.reason]))
  const selectedUrls = new Set<string>()
  const results: SlotResult[] = []

  for (const genre of genres) {
    for (const horizon of horizons) {
      const failedReason = failedReasonByGenre.get(genre)
      if (failedReason) {
        results.push({ genre, horizon, status: 'collection-failed', reason: failedReason })
        continue
      }

      const slotCandidates = candidates.filter((c) => c.genre === genre && c.horizon === horizon)
      const candidateCount = slotCandidates.length

      const remaining = slotCandidates.filter((c) => {
        const normalized = normalizeUrl(c.sourceUrl)
        return !deliveredUrls.has(normalized) && !selectedUrls.has(normalized)
      })

      if (remaining.length === 0) {
        results.push({ genre, horizon, status: 'no-candidate', candidateCount })
        continue
      }

      const [winner] = [...remaining].sort((a, b) => {
        const impactDiff = impactRankValue(a.impact) - impactRankValue(b.impact)
        if (impactDiff !== 0) return impactDiff
        return a.impactRank - b.impactRank
      })

      selectedUrls.add(normalizeUrl(winner.sourceUrl))
      results.push({ genre, horizon, status: 'selected', candidate: winner, candidateCount })
    }
  }

  return results
}
