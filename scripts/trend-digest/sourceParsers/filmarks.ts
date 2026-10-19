// Filmarks上映中ランキングの専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// 日本映画・海外映画の補助情報源(watchlist.json「Filmarks上映中ランキング」)。
//
// HTML構造(2026-09-27時点で実際に取得して確認): `/list/now`はデフォルトで「おすすめ順」表示で
// 明示的な順位を持たず、各作品カード(`<div class="js-cassette">`区切り)にFilmarksの
// ユーザー評価スコア(`<div class="c-rating__score">4.3</div>`)とタイトル(ポスター画像の
// `<img alt="タイトル">`)がある。順位はページ上に存在しないため、取得した作品をスコア降順に
// 並べ替え、その順序を現在順位として採用する(design.md「候補ごとにstrength=100-現在の順位」の
// 前提となる「現在の順位」をこのパーサー内で組み立てる)
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function filmarks(html: string): RankedItem[] {
  const chunks = html.split('<div class="js-cassette"').slice(1)
  const scored: Array<{ title: string; score: number }> = []

  for (const chunk of chunks) {
    const titleMatch = chunk.match(/<img alt="([^"]+)"/)
    const scoreMatch = chunk.match(/c-rating__score">([\d.]+)<\/div>/)
    if (!titleMatch || !scoreMatch) continue
    const title = titleMatch[1].trim()
    if (!title) continue
    scored.push({ title, score: Number(scoreMatch[1]) })
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ title: entry.title, currentRank: index + 1 }))
}
