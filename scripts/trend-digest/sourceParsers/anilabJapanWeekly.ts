// AniLab「日本ウィークリーアニメランキング」の専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// アニメジャンル(併用ジャンル)の固定リスト側の情報源の1つ(watchlist.json
// 「AniLab 日本ウィークリーアニメランキング」)。
//
// HTML構造(2026-09-28時点で実際に取得して確認): ページ上部の「順位が上昇した作品」を紹介する
// セクションに、`「タイトル」が順位を N 上げて、日本M位にランクイン`という文中表記で
// 前週比の順位変動が直接テキストとして埋め込まれている(Mが現在順位、Nが上昇幅。
// 前週順位はM+N)。カルーセル表示のため同じ項目がDOM内に複数回現れるので、
// タイトル+現在順位の組で重複を除く。ページ下部の全ランキング表はJS側で描画されるため
// (fetch取得したHTMLには含まれない)、このパーサーでは扱わない
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function anilabJapanWeekly(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const seen = new Set<string>()
  const pattern = /「([^」]+)」が順位を\s*(\d+)\s*上げて、日本(\d+)位にランクイン/g

  for (const match of html.matchAll(pattern)) {
    const title = match[1].trim()
    const improvement = Number(match[2])
    const currentRank = Number(match[3])
    if (!title || !Number.isInteger(improvement) || !Number.isInteger(currentRank)) continue

    const key = `${title}::${currentRank}`
    if (seen.has(key)) continue
    seen.add(key)

    items.push({ title, currentRank, previousRank: currentRank + improvement })
  }

  return items
}
