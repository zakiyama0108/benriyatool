// Billboard JAPAN Hot 100の専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// 音楽ジャンルの唯一の情報源(watchlist.json「Billboard JAPAN Hot 100」)。
//
// HTML構造(2026-09-27時点で実際に取得して確認): 1曲ごとに`<tr class="rankN">`
// (Nが現在の順位。まれに`id="rank10"`等のアンカーが付くことがある)。曲タイトルは
// `<p class="musuc_title">`(サイト側の実装上のtypo。原文ママ)、前週順位は同じ行内の
// `<span class="last">前回：N</span>`("-"の場合は前週ランク外=新規ランクイン)から読み取る
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function billboardJapan(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const rowPattern = /<tr class="rank(\d+)"[^>]*>([\s\S]*?)<\/tr>/g
  for (const match of html.matchAll(rowPattern)) {
    const currentRank = Number(match[1])
    const body = match[2]
    const titleMatch = body.match(/musuc_title">\s*([^<]+?)\s*<\/p>/)
    if (!titleMatch) continue
    const title = titleMatch[1].trim()
    if (!title) continue

    const item: RankedItem = { title, currentRank }
    const prevMatch = body.match(/前回：([^<]*)/)
    if (prevMatch) {
      const prevText = prevMatch[1].trim()
      if (prevText === '-') {
        item.isNew = true
      } else if (/^\d+$/.test(prevText)) {
        item.previousRank = Number(prevText)
      }
    }
    items.push(item)
  }
  return items
}
