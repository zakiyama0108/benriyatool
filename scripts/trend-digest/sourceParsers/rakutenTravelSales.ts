// 楽天トラベル「全国 国内ツアー売れ筋ホテル・旅館ランキング」の専用パーサー
// (仕様: design.md「サイトごとの専用パーサー」)。旅行・観光ジャンルの情報源の1つ
// (watchlist.json「楽天トラベル国内ツアー売れ筋ランキング」)。
//
// HTML構造(2026-10-20時点で実際に取得して確認): 順位は`<li class="rank01">`のようなCSSクラス名
// (2桁の数値)で表現される。ホテル名は同じ`<li>`内最初の`<h3><a>タイトル</a></h3>`。前週比データは
// このページには無いため順位のみを返す(じゃらんnet人気ランキングと同様、新規ランクイン判定は
// 過去記事との突き合わせに委ねる。design.md「固定リストジャンルの候補を収集・判定する処理」手順3)
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function rakutenTravelSales(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const blocks = html.match(/<li class="rank\d+">[\s\S]*?<\/li>/g) ?? []

  for (const block of blocks) {
    const rankMatch = block.match(/rank(\d+)/)
    const titleMatch = block.match(/<h3><a[^>]*>([^<]+)<\/a><\/h3>/)
    if (!rankMatch || !titleMatch) continue
    const title = titleMatch[1].trim()
    if (!title) continue
    items.push({ title, currentRank: Number(rankMatch[1]) })
  }

  return items
}
