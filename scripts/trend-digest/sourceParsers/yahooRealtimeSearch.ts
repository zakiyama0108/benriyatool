// Yahoo!リアルタイム検索の専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// SNSバズりジャンルの併用ジャンル化にともなう固定リスト側の情報源(watchlist.json
// 「Yahoo!リアルタイム検索」)。
//
// HTML構造(2026-10-20時点で実際に取得して確認): このページはNext.jsアプリで、表示用のCSS
// クラス名はビルドごとに変わるハッシュ付き(例: `Trend_rankArrow__dLNqV`)のため正規表現で
// 直接読まない。`<script id="__NEXT_DATA__" type="application/json">`に埋め込まれた
// `props.pageProps.pageData.buzzTrend.items`配列(各要素が`{query, rankUp, rankDiff, ...}`)を
// JSONとしてパースする(famitsu.tsと同じ方針)。配列の掲載順がそのままリアルタイムの話題性の
// 順位のため、掲載順を現在順位として採用する。前週比データはこのページの性質上「週次」の
// 意味を持たないため使わない
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

type RawBuzzTrendItem = { query?: unknown }

function isRawBuzzTrendItem(value: unknown): value is RawBuzzTrendItem {
  return typeof value === 'object' && value !== null
}

export function yahooRealtimeSearch(html: string): RankedItem[] {
  const scriptMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!scriptMatch) return []

  let data: unknown
  try {
    data = JSON.parse(scriptMatch[1])
  } catch {
    return []
  }

  const items = (
    data as { props?: { pageProps?: { pageData?: { buzzTrend?: { items?: unknown } } } } }
  )?.props?.pageProps?.pageData?.buzzTrend?.items
  if (!Array.isArray(items)) return []

  const result: RankedItem[] = []
  items.forEach((row, index) => {
    if (!isRawBuzzTrendItem(row)) return
    if (typeof row.query !== 'string' || row.query.trim() === '') return
    result.push({ title: row.query.trim(), currentRank: index + 1 })
  })
  return result
}
