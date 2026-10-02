import type { Genre, Impact } from './types'
import { IMPACT_ORDER } from './types'
import type { Candidate, CollectionFailureReason, GenreResult } from './candidateTypes'
import type { DeliveredIndex } from './deliveredIndex'
import { normalizeDoi, normalizeUrl } from './deliveredIndex'

export type CollectionFailedGenre = { genre: Genre; reason: CollectionFailureReason }

function impactOrderValue(impact: Impact): number {
  return IMPACT_ORDER.indexOf(impact)
}

// ジャンルごとの採用・候補なしの記録・収集失敗ジャンルの合流(仕様: content-selection/requirements.md#機能要件-2〜4、
// content-selection/requirements.md#影響度-3、content-selection/requirements.md#候補が見つからないジャンル-1、
// content-selection/requirements.md#収集失敗-1、content-selection/design.md「ジャンルごとに1本を採用する処理」)。
// genresの引数順(ジャンル順)に処理し、同じ回の別のジャンルで採用済みのURL・DOIも重複除外の対象にする
// (手順5「重複除外の結果を毎回同じにするため」)
export function selectGenres(
  candidatesByGenre: Record<Genre, Candidate[]>,
  genres: Genre[], // 有効なジャンルのid一覧(genres.json記載順)
  delivered: DeliveredIndex,
  collectionFailedGenres: CollectionFailedGenre[],
): GenreResult[] {
  const failedReasonByGenre = new Map(collectionFailedGenres.map((f) => [f.genre, f.reason]))
  const selectedUrls = new Set<string>()
  const selectedDois = new Set<string>()
  const results: GenreResult[] = []

  for (const genre of genres) {
    const failedReason = failedReasonByGenre.get(genre)
    if (failedReason) {
      results.push({ genre, status: 'collection-failed', reason: failedReason })
      continue
    }

    const genreCandidates = candidatesByGenre[genre] ?? []
    const candidateCount = genreCandidates.length

    // 配信済み・同じ回で採用済みのURL・DOIと一致する候補を除く(Claudeの判定漏れへの最終防波堤)
    const remaining = genreCandidates.filter((c) => {
      const url = normalizeUrl(c.sourceUrl)
      const doi = c.doi ? normalizeDoi(c.doi) : null
      if (delivered.urls.has(url) || selectedUrls.has(url)) return false
      if (doi && (delivered.dois.has(doi) || selectedDois.has(doi))) return false
      return true
    })

    if (remaining.length === 0) {
      results.push({ genre, status: 'no-candidate', candidateCount })
      continue
    }

    // 影響度の大きい順、同じ影響度では順位の小さい順(Array.sortは安定ソートのため同順位は入力順)
    const [winner] = [...remaining].sort((a, b) => {
      const impactDiff = impactOrderValue(a.impact) - impactOrderValue(b.impact)
      if (impactDiff !== 0) return impactDiff
      return a.impactRank - b.impactRank
    })

    selectedUrls.add(normalizeUrl(winner.sourceUrl))
    if (winner.doi) selectedDois.add(normalizeDoi(winner.doi))
    results.push({ genre, status: 'selected', candidate: winner, candidateCount })
  }

  return results
}
