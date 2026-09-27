// トーハン週間ベストセラーの専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// 書籍・漫画ジャンルの情報源の1つ(watchlist.json「トーハン週間ベストセラー」)。
//
// HTML構造(2026-09-27時点で実際に取得して確認): 順位は数値テキストではなく`<li class="item
// rank-1st">`のようなCSSクラス名(英語の序数)で表現される。タイトルは
// `<h3 class="ttl-cmn-04 s-fw-b">タイトル</h3>`。前週比データはこのページには無いため
// 順位のみを返す(books-comicsの新規ランクイン判定はrecentPublishedNormalizedTitlesによる
// 過去記事との突き合わせで行う。design.md「固定リストジャンルの候補を収集・判定する処理」手順3)
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function tohan(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const blocks = html.match(/<li class="item rank-\d+[a-z]+">[\s\S]*?<\/li>/g) ?? []

  for (const block of blocks) {
    const rankMatch = block.match(/rank-(\d+)[a-z]+/)
    const titleMatch = block.match(/<h3 class="ttl-cmn-04[^"]*">([^<]+)<\/h3>/)
    if (!rankMatch || !titleMatch) continue
    const title = titleMatch[1].trim()
    if (!title) continue
    items.push({ title, currentRank: Number(rankMatch[1]) })
  }

  return items
}
