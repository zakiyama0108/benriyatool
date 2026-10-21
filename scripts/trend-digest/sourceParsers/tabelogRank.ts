// 食べログ「人気のグルメ ランキングTOP20」の専用パーサー(仕様: design.md「サイトごとの
// 専用パーサー」)。グルメジャンルの併用ジャンル化にともなう固定リスト側の情報源
// (watchlist.json「食べログ人気ランキング」)。
//
// HTML構造(2026-10-20時点で実際に取得して確認): `tabelog.com/rank/`は料理ジャンルを横断した
// 全国ランキングで、1件が`<li class="list-rst rstlst_group ...">`。順位は`<i
// class="c-ranking-badge__contents ...">`内の数値、店名は同じ`<li>`内の`<h3 class="list-rst__rst
// -name-heading...">`内の`<a>`テキスト。前週比データはこのページには無いため順位のみを返す
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

// 各店舗の`<li class="list-rst rstlst_group ...">`の内側に、サムネイル画像用の
// `<li class="list-rst__thumb-item ...">`が入れ子で存在する(店名を含むh3見出しより手前)。
// 正規表現では入れ子の</li>を区別できないため、次の店舗の開始タグが来るまでを1店舗分として
// 切り出す(終了タグへのマッチには依存しない)
function splitRestaurantBlocks(html: string): string[] {
  const startMarker = '<li class="list-rst rstlst_group'
  const starts: number[] = []
  let searchFrom = 0
  while (true) {
    const index = html.indexOf(startMarker, searchFrom)
    if (index === -1) break
    starts.push(index)
    searchFrom = index + startMarker.length
  }
  return starts.map((start, i) => html.slice(start, i + 1 < starts.length ? starts[i + 1] : undefined))
}

export function tabelogRank(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const blocks = splitRestaurantBlocks(html)

  for (const block of blocks) {
    const rankMatch = block.match(/<i class="c-ranking-badge__contents[^"]*">(\d+)<\/i>/)
    const titleMatch = block.match(/<h3 class="list-rst__rst-name-heading[^"]*">\s*<a[^>]*>([^<]+)<\/a>/)
    if (!rankMatch || !titleMatch) continue
    const title = titleMatch[1].trim()
    if (!title) continue
    items.push({ title, currentRank: Number(rankMatch[1]) })
  }

  return items
}
