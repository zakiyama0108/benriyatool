// 価格.com「家電カテゴリランキング」の専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// ガジェット・家電ジャンルの併用ジャンル化にともなう固定リスト側の情報源(watchlist.json
// 「価格.com家電カテゴリランキング」)。
//
// HTML構造(2026-10-20時点で実際に取得して確認): `kakaku.com/ranking/`(総合)はカードゲーム等
// 家電以外の商品も混在するため、家電カテゴリに絞った`kakaku.com/ranking/kaden/`を情報源とする。
// 各商品行は`<td class="rankingRate">`で始まる(上位3件だけ装飾用の`<div class="itemElements">`で
// 囲まれ、4位以降は囲みが無いため、両方に共通する`rankingRate`を行の区切りに使う)。順位は
// `<p class="ranknum ...">`内の`<span>数値</span>`、商品名は同じ行内の最初の`<img alt="...">`
// 属性から取得する(商品名が`<a>`テキストではなく画像altに入っているテンプレートのため)。各行の
// 内部には商品バリエーション選択用の入れ子の`<table>`があり、正規表現では入れ子の終了タグを
// 区別できないため、次の行の開始タグが来るまでを1商品分として切り出す(終了タグへのマッチには
// 依存しない。tabelogRank.tsと同じ方針)。前週比データはこのページには無いため順位のみを返す
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

function splitItemBlocks(html: string): string[] {
  const startMarker = '<td class="rankingRate">'
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

export function kakakuRanking(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const blocks = splitItemBlocks(html)

  for (const block of blocks) {
    const rankMatch = block.match(/<p class="ranknum[^"]*"><span>(\d+)<\/span>/)
    const titleMatch = block.match(/<img alt="([^"]+)"/)
    if (!rankMatch || !titleMatch) continue
    const title = titleMatch[1].trim()
    if (!title) continue
    items.push({ title, currentRank: Number(rankMatch[1]) })
  }

  return items
}
