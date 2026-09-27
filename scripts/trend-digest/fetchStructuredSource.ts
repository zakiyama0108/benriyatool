// 構造化データ情報源(structured-tsv/structured-rss/structured-json-api)の取得・パース
// (仕様: design.md「データ設計」FixedListSourceFormat)。公式の構造化データをそのまま取得し
// パースする(HTML解析を要さないため最も安定している。design.md「固定リストジャンルの候補を
// 収集・判定する処理」手順1)。TDD対象は各parse関数(純粋関数)のみとし、実際のHTTP取得は
// fetchHtml(fetchSourcePage.ts)と同じ最小限のfetch呼び出しに留める
import type { RankedItem } from '../../app/trend-digest/lib/fetchFixedListCandidates'

// --- structured-tsv: Netflix公式Top10データ ---
// (`netflix.com/tudum/top10/data/all-weeks-countries.tsv`。実際に取得して確認した列は
// country_name/country_iso2/week/category/weekly_rank/show_title/season_title/
// cumulative_weeks_in_top_10で、category列は"Films"と"TV"の2種類のみ(アニメ専用の分類は
// 存在しない。design.mdの「日本のTOP10」というanimeジャンルの情報源の説明には、この2種類の
// どちらを見ればアニメだけを取り出せるかの基準がなく、Netflixの公開データだけでは
// アニメ作品と実写作品を機械的に区別できない。この区別方法はsource-reviewで決める)
export type NetflixCategory = 'Films' | 'TV'

type NetflixRow = {
  country_name: string
  week: string
  category: string
  weekly_rank: string
  show_title: string
  season_title: string
}

function parseTsvRows(tsv: string): NetflixRow[] {
  const lines = tsv.split('\n').filter((line) => line.trim() !== '')
  if (lines.length === 0) return []
  const header = lines[0].split('\t')
  const rows: NetflixRow[] = []
  for (const line of lines.slice(1)) {
    const cols = line.split('\t')
    const row: Record<string, string> = {}
    header.forEach((col, i) => {
      row[col.trim()] = (cols[i] ?? '').trim()
    })
    rows.push(row as unknown as NetflixRow)
  }
  return rows
}

// 同一作品を突き合わせるキー(design.md「掲載する話題の選び方-8」と同様、シリーズと季が
// 混在するため season_titleがある場合はそれも含めて突き合わせる。「Films」はseason_titleが
// 常に"N/A"のためshow_titleのみで突き合わされる)
function rowKey(row: NetflixRow): string {
  return row.season_title && row.season_title !== 'N/A' ? `${row.show_title}::${row.season_title}` : row.show_title
}

// 対象国・カテゴリの最新週のランキングを、直前週の同じ国・カテゴリのランキングと突き合わせて
// 前週順位(見つからない場合は新規ランクイン)付きで返す(design.md手順3
// 「Netflix TSVなら前週分の行」)
export function parseNetflixTsv(tsv: string, country: string, category: NetflixCategory): RankedItem[] {
  const rows = parseTsvRows(tsv).filter((row) => row.country_name === country && row.category === category)
  if (rows.length === 0) return []

  const weeks = [...new Set(rows.map((row) => row.week))].sort()
  const latestWeek = weeks[weeks.length - 1]
  const previousWeek = weeks.length >= 2 ? weeks[weeks.length - 2] : null

  const previousRankByKey = new Map<string, number>()
  if (previousWeek) {
    for (const row of rows.filter((r) => r.week === previousWeek)) {
      previousRankByKey.set(rowKey(row), Number(row.weekly_rank))
    }
  }

  const items: RankedItem[] = []
  for (const row of rows.filter((r) => r.week === latestWeek)) {
    const currentRank = Number(row.weekly_rank)
    if (!Number.isInteger(currentRank)) continue
    const title = row.show_title.trim()
    if (!title) continue

    const previousRank = previousRankByKey.get(rowKey(row))
    items.push(previousRank === undefined ? { title, currentRank, isNew: true } : { title, currentRank, previousRank })
  }
  return items
}

// --- structured-rss: Google公式トレンドRSS ---
// (`trends.google.com/trending/rss?geo=JP`。実際に取得して確認した構造: <item>ごとに<title>を
// 持ち、フィード内の並び順がそのまま話題性の強さの順になっている。明示的な順位番号は
// フィード自体に無いため、掲載順を現在順位として採用する)
export function parseGoogleTrendsRss(xml: string): RankedItem[] {
  const items: RankedItem[] = []
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  itemBlocks.forEach((block, index) => {
    const titleMatch = block.match(/<title>([^<]+)<\/title>/)
    if (!titleMatch) return
    const title = titleMatch[1].trim()
    if (!title) return
    items.push({ title, currentRank: index + 1 })
  })
  return items
}

// --- structured-json-api: Steam公式Web API(ISteamChartsService/GetMostPlayedGames) ---
// (実際に取得して確認した応答: `response.ranks`が`{rank, appid, last_week_rank, peak_in_game}`の
// 配列。**タイトル(ゲーム名)を含まず、Steamの数値アプリID(appid)のみを返す**。ゲーム名は
// `store.steampowered.com/api/appdetails?appids=<id>`の別のAPI呼び出しで解決する必要があり、
// このAPIは1呼び出しにつきappidを1件しか受け付けない(複数件を1回のリクエストで解決できない)。
// このファイルではレスポンスのパースのみを行い(design.md「関連するファイル」の対象)、
// 名前解決の実施(何位まで解決するか・追加のHTTP呼び出し)はfetchFixedListCandidates.tsの
// format別ディスパッチ側(Task14)に委ねる
export type SteamRank = { rank: number; appid: number; previousRank?: number }

// appid1件のゲーム名を解決する関数。実際のHTTP通信はscripts側が注入する(テストではモックを渡す)
export type SteamAppNameFetcher = (appid: number) => Promise<string | null>

// Steamのランキング(appidのみ)にゲーム名を解決して付与する(design.md「固定リストジャンルの
// 候補を収集・判定する処理」手順1)。appdetailsは1呼び出しにつきappid1件のみしか解決できない
// (複数件をまとめて解決できない)ため、上位nameResolutionLimit件までに限定して解決する
// (30件全件を毎回解決すると週次実行のたびに数十回のHTTP呼び出しが発生するため)。
// 解決できなかった(404等)appidはその項目だけ観測項目から除外する(架空の名前を作らない)
export async function resolveSteamRanking(
  ranks: SteamRank[],
  fetchAppName: SteamAppNameFetcher,
  nameResolutionLimit: number
): Promise<RankedItem[]> {
  const items: RankedItem[] = []
  for (const rankRow of ranks.slice(0, nameResolutionLimit)) {
    const title = await fetchAppName(rankRow.appid)
    if (!title) continue
    items.push(
      rankRow.previousRank === undefined
        ? { title, currentRank: rankRow.rank }
        : { title, currentRank: rankRow.rank, previousRank: rankRow.previousRank }
    )
  }
  return items
}

export function parseSteamMostPlayed(json: string): SteamRank[] {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return []
  }
  const ranks = (data as { response?: { ranks?: unknown } })?.response?.ranks
  if (!Array.isArray(ranks)) return []

  const items: SteamRank[] = []
  for (const row of ranks) {
    if (typeof row !== 'object' || row === null) continue
    const { rank, appid, last_week_rank: lastWeekRank } = row as Record<string, unknown>
    if (typeof rank !== 'number' || !Number.isInteger(rank)) continue
    if (typeof appid !== 'number' || !Number.isInteger(appid)) continue
    const item: SteamRank = { rank, appid }
    if (typeof lastWeekRank === 'number' && Number.isInteger(lastWeekRank)) {
      item.previousRank = lastWeekRank
    }
    items.push(item)
  }
  return items
}
