// ビデオリサーチ「視聴人数ランキング」の専用パーサー(仕様: design.md「サイトごとの専用パーサー」
// 「補足(ビデオリサーチのURL)」)。日本ドラマ・バラエティ両ジャンルの情報源
// (watchlist.json「ビデオリサーチ 視聴人数ランキング(ドラマ/バラエティ)」)。
//
// HTML構造(2026-09-27時点で実際に取得して確認): `videor.co.jp/audience/`は1ページの中に
// ジャンルごとのセクション(`id="block01"`=ドラマ、`id="block02"`=バラエティ、以降スポーツ・
// アニメ・音楽・映画...と続く)を持ち、各セクション内の`<table>`に`<tr><td>順位</td><td>番組名</td>...`
// の行が並ぶ(見出し行は順位列が数字でないため自然に除外される)。前週比データはこのページには
// 無いため、順位のみを返す(japanese-drama/varietyの採用基準はrankThresholdのみで前週比を
// 使わないため支障はない)
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

// idが指すジャンルのセクションを、次のセクション(id="blockN")の直前までの範囲として取り出す
function extractBlock(html: string, blockId: string): string {
  const start = html.indexOf(`id="${blockId}"`)
  if (start === -1) return ''
  const rest = html.slice(start + 1)
  const nextBlockMatch = rest.match(/id="block\d+"/)
  const end = nextBlockMatch ? start + 1 + (nextBlockMatch.index ?? 0) : html.length
  return html.slice(start, end)
}

function parseRankingTable(blockHtml: string): RankedItem[] {
  const items: RankedItem[] = []
  const rowPattern = /<tr>\s*<td>(\d+)<\/td>\s*<td>([^<]+)<\/td>/g
  for (const match of blockHtml.matchAll(rowPattern)) {
    const title = match[2].trim()
    if (!title) continue
    items.push({ title, currentRank: Number(match[1]) })
  }
  return items
}

export function videoResearchDrama(html: string): RankedItem[] {
  return parseRankingTable(extractBlock(html, 'block01'))
}

export function videoResearchVariety(html: string): RankedItem[] {
  return parseRankingTable(extractBlock(html, 'block02'))
}
