// 日販週間ベストセラーの専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// 書籍・漫画ジャンルの情報源の1つ(watchlist.json「日販週間ベストセラー」)。
//
// HTML構造(2026-09-27時点で実際に取得して確認): 1冊1行の`<tr>`。現在順位・前週順位はどちらも
// `<td class="c-single03__table-rank ... u-serif u-uppercase">`という共通クラスを持つ2つの
// セル(1つ目は現在順位。方向を示す`is-new`/`is-up`/`is-down`のクラスが追加で付く。2つ目は
// 前週順位で「-」なら前週ランク外)。タイトルは`<a class="c-single03__table-link">タイトル</a>`
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function nippan(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const rows = html.match(/<tr>[\s\S]*?<\/tr>/g) ?? []

  for (const row of rows) {
    const rankMatches = [...row.matchAll(/c-single03__table-rank[^"]*u-serif u-uppercase">\s*([\d-]+)/g)]
    const titleMatch = row.match(/c-single03__table-link">([^<]+)<\/a>/)
    if (rankMatches.length < 2 || !titleMatch) continue
    const currentRankText = rankMatches[0][1]
    if (!/^\d+$/.test(currentRankText)) continue
    const title = titleMatch[1].trim()
    if (!title) continue

    const item: RankedItem = { title, currentRank: Number(currentRankText) }
    const previousRankText = rankMatches[1][1]
    if (previousRankText === '-') {
      item.isNew = true
    } else if (/^\d+$/.test(previousRankText)) {
      item.previousRank = Number(previousRankText)
    }
    items.push(item)
  }

  return items
}
