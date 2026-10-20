// GitHub Trending(`github.com/trending`)の専用パーサー(仕様: design.md「サイトごとの
// 専用パーサー」)。開発手法・開発サービスジャンルの併用ジャンル化にともなう固定リスト側の情報源
// (watchlist.json「GitHub Trending」)。
//
// HTML構造(2026-10-20時点で実際に取得して確認): 1リポジトリが`<article class="Box-row">`。
// リポジトリ名は`<h2 class="h3 lh-condensed">`内の`<a href="/owner/repo">`のhref属性から
// 取得する(表示テキストは改行・SVGアイコンを含み整形が煩雑なため、owner/repoが直接入っている
// href属性から取る)。ページ掲載順をそのまま現在順位として採用する(前週比データはこのページには
// 無い)
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function githubTrending(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const blocks = html.match(/<article class="Box-row">[\s\S]*?<\/article>/g) ?? []

  blocks.forEach((block, index) => {
    const headingMatch = block.match(/<h2 class="h3 lh-condensed">[\s\S]*?<\/h2>/)
    if (!headingMatch) return
    const hrefMatch = headingMatch[0].match(/href="\/([^"/]+\/[^"/?]+)"/)
    if (!hrefMatch) return
    const title = hrefMatch[1].trim()
    if (!title) return
    items.push({ title, currentRank: index + 1 })
  })

  return items
}
