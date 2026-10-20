// Yahoo!ファイナンス「日本株ランキング(出来高増加率)」の専用パーサー
// (仕様: design.md「サイトごとの専用パーサー」)。経済・お金ジャンルの併用ジャンル化にともなう
// 固定リスト側の情報源(watchlist.json「Yahoo!ファイナンス出来高増加率ランキング」)。
//
// HTML構造(2026-10-20時点で実際に取得して確認): 1銘柄が`<tr class="RankingTable__row__...">`。
// 順位はCSSモジュール由来のビルドごとのハッシュ付きクラス名(`RankingTable__rank__3dXJ`等)を
// 持つ`<th>`、銘柄名は`RankingTable__detail__...`を持つ`<td>`内の`<a>`テキスト。ハッシュ部分は
// ビルドが変わると変化する可能性があるため、クラス名の前方一致(`RankingTable__rank`
// /`RankingTable__detail`)だけで判定する(完全一致にしない)
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function yahooFinanceVolumeIncrease(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const rows = html.match(/<tr class="RankingTable__row[^"]*">[\s\S]*?<\/tr>/g) ?? []

  for (const row of rows) {
    const rankMatch = row.match(/<th[^>]*class="[^"]*RankingTable__rank[^"]*"[^>]*>(\d+)<\/th>/)
    const titleMatch = row.match(/<td[^>]*class="[^"]*RankingTable__detail[^"]*"[^>]*><a[^>]*>([^<]+)<\/a>/)
    if (!rankMatch || !titleMatch) continue
    const title = titleMatch[1].trim()
    if (!title) continue
    items.push({ title, currentRank: Number(rankMatch[1]) })
  }

  return items
}
