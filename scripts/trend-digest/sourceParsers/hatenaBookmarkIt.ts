// はてなブックマーク「人気エントリー・テクノロジー」(`b.hatena.ne.jp/hotentry/it`)の
// 専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。開発手法・開発サービスジャンルの
// 併用ジャンル化にともなう固定リスト側の情報源(watchlist.json「はてなブックマークITカテゴリ」)。
//
// HTML構造(2026-10-20時点で実際に取得して確認): 1記事の見出しが`<h3
// class="entrylist-contents-title"><a ...>見出し</a></h3>`。ページ掲載順(=人気順)をそのまま
// 現在順位として採用する(前週比データはこのページには無い)
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function hatenaBookmarkIt(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const headings = html.match(/<h3 class="entrylist-contents-title">[\s\S]*?<\/h3>/g) ?? []

  headings.forEach((heading, index) => {
    const titleMatch = heading.match(/<a[^>]*>([^<]+)<\/a>/)
    if (!titleMatch) return
    const title = titleMatch[1].trim()
    if (!title) return
    items.push({ title, currentRank: index + 1 })
  })

  return items
}
