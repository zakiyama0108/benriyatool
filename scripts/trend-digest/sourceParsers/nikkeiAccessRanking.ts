// 日経電子版「アクセスランキング」の専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// 経済・お金ジャンルの併用ジャンル化にともなう固定リスト側の情報源(watchlist.json
// 「日経電子版アクセスランキング」)。
//
// HTML構造(2026-10-20時点で実際に取得して確認): `<li class="m-sub_access_ranking_list">`が
// 1記事に対応し、順位は`<span class="m-sub_access_ranking_number">1.</span>`、見出しは
// `<span class="m-sub_access_ranking_title">`直下のテキスト(有料会員限定記事は末尾に
// `<span class="m-iconMemberGold">`が入れ子で続くため、そこより手前のテキストのみを見出しとして
// 取る)。見出し・公開日時はログインなしで取得できる(本文のみ有料会員限定)。前週比データは
// このページには無いため順位のみを返す
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function nikkeiAccessRanking(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const blocks = html.match(/<li class="m-sub_access_ranking_list"[\s\S]*?<\/li>/g) ?? []

  for (const block of blocks) {
    const rankMatch = block.match(/<span class="m-sub_access_ranking_number">(\d+)\./)
    const titleMatch = block.match(/<span class="m-sub_access_ranking_title">([^<]+)/)
    if (!rankMatch || !titleMatch) continue
    const title = titleMatch[1].trim()
    if (!title) continue
    items.push({ title, currentRank: Number(rankMatch[1]) })
  }

  return items
}
