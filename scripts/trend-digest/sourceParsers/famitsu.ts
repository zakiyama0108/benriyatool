// ファミ通.com売上ランキングの専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// ゲームジャンルの情報源の1つ(watchlist.json「ファミ通.com売上ランキング」)。
//
// HTML構造(2026-09-27時点で実際に取得して確認): このページはNext.jsアプリで、DOM上のHTMLを
// 正規表現で読むのではなく、`<script id="__NEXT_DATA__" type="application/json">`に埋め込まれた
// 初期表示用の構造化データ(`props.pageProps.gameSalesRankingData.rankingData`配列。各要素が
// `{rank, title, ...}`)を直接JSONとしてパースする。DOM構造の変化(クラス名変更等)に影響されにくい。
// 前週比データはこの配列には含まれないため順位のみを返す
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

type RawRankingRow = { rank?: unknown; title?: unknown }

function isRawRankingRow(value: unknown): value is RawRankingRow {
  return typeof value === 'object' && value !== null
}

export function famitsu(html: string): RankedItem[] {
  const scriptMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!scriptMatch) return []

  let data: unknown
  try {
    data = JSON.parse(scriptMatch[1])
  } catch {
    return []
  }

  const rankingData = (
    data as { props?: { pageProps?: { gameSalesRankingData?: { rankingData?: unknown } } } }
  )?.props?.pageProps?.gameSalesRankingData?.rankingData
  if (!Array.isArray(rankingData)) return []

  const items: RankedItem[] = []
  for (const row of rankingData) {
    if (!isRawRankingRow(row)) continue
    const rank = Number(row.rank)
    if (!Number.isInteger(rank) || rank < 1) continue
    if (typeof row.title !== 'string' || row.title.trim() === '') continue
    items.push({ title: row.title.trim(), currentRank: rank })
  }
  return items
}
