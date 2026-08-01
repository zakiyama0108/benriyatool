import type { Candidate } from './candidateTypes'
import type { Criteria } from './watchlistTypes'
import type { SourceType } from './types'
import type { WatchlistEntry } from './watchlistTypes'

// 各情報源への問い合わせ処理(仕様: requirements.md#データ取得方法-1、
// design.md「情報源から候補を収集する処理」)。外部APIへのHTTP呼び出しを伴うため、
// レスポンス形状のパース・エラー処理のみをモックしたテストの対象とする(design.md参照)。
// 実際の外部通信はHttpClientとして注入し、実装コード自体はfetch()を直接呼ばない
// (テストでモックしやすくするため。実運用ではfetch()を使う実装をscripts側で注入する)
export type HttpClient = {
  fetchJson: (url: string) => Promise<unknown>
  fetchText: (url: string) => Promise<string>
}

// fetch()をそのまま使う本番用HttpClient(scripts/ai-dev-digest/collect-and-select.tsから利用)
export const fetchHttpClient: HttpClient = {
  async fetchJson(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} の取得に失敗しました(status: ${res.status})`)
    const data: unknown = await res.json()
    return data
  },
  async fetchText(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} の取得に失敗しました(status: ${res.status})`)
    return res.text()
  },
}

type YoutubeChannelsResponse = { items?: { id: string }[] }
type YoutubeSearchResponse = {
  items?: { id?: { videoId?: string }; snippet?: { title?: string; publishedAt?: string } }[]
}
type YoutubeVideosResponse = { items?: { id: string; statistics?: { viewCount?: string } }[] }

// watchlist.jsonのchannelId(例: "@AndrejKarpathy")から、YouTube Data APIが要求する
// 内部チャンネルID(UC...)を解決する(design.md「情報源から候補を収集する処理」手順1)
async function resolveYoutubeChannelId(handle: string, apiKey: string, http: HttpClient): Promise<string> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`
  const data = (await http.fetchJson(url)) as YoutubeChannelsResponse
  const channelId = data.items?.[0]?.id
  if (!channelId) throw new Error(`YouTubeチャンネルが見つかりません: ${handle}`)
  return channelId
}

// 対象チャンネルの直近動画と再生回数を取得し、Candidate配列に変換する。
// individual-youtubeの場合のみ、直近の1本を「候補」、それに続くwindow本を
// 「平均再生回数の算出対象」として扱う(自分自身を平均に含めると自己比較になるため除外する。
// 要件は算出対象の範囲を明記していないため設計判断)
export async function fetchYoutubeCandidates(
  entry: WatchlistEntry,
  apiKey: string,
  criteria: Criteria,
  http: HttpClient
): Promise<Candidate[]> {
  const handle = entry.channels.find((c) => c.type === 'youtube')?.channelId
  if (!handle) return []

  const channelId = await resolveYoutubeChannelId(handle, apiKey, http)

  const window = entry.category === 'individual-youtube' ? criteria.youtubeRecentVideoWindow : 1
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=${window + 1}&type=video&key=${apiKey}`
  const searchData = (await http.fetchJson(searchUrl)) as YoutubeSearchResponse
  const videos = (searchData.items ?? [])
    .map((item) => ({ videoId: item.id?.videoId, title: item.snippet?.title, publishedAt: item.snippet?.publishedAt }))
    .filter((v): v is { videoId: string; title: string; publishedAt: string } => Boolean(v.videoId && v.title && v.publishedAt))

  if (videos.length === 0) return []

  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videos.map((v) => v.videoId).join(',')}&key=${apiKey}`
  const statsData = (await http.fetchJson(statsUrl)) as YoutubeVideosResponse
  const viewCountById = new Map((statsData.items ?? []).map((item) => [item.id, Number(item.statistics?.viewCount ?? 0)]))

  const [latest, ...rest] = videos
  const sourceType: SourceType = entry.category === 'official' ? 'official' : 'individual-youtube'
  const recentAverageViews =
    entry.category === 'individual-youtube' && rest.length > 0
      ? rest.reduce((sum, v) => sum + (viewCountById.get(v.videoId) ?? 0), 0) / rest.length
      : undefined

  return [
    {
      sourceId: entry.id,
      sourceName: entry.name,
      sourceType,
      heading: latest.title,
      url: `https://www.youtube.com/watch?v=${latest.videoId}`,
      publishedAt: latest.publishedAt,
      metricValue: viewCountById.get(latest.videoId) ?? 0,
      ...(recentAverageViews !== undefined ? { recentAverageViews } : {}),
    },
  ]
}

// RSS/Atomフィードの<item>/<entry>を雑駁に抽出する。外部ライブラリを追加せず、
// 対象情報源(公式組織のブログ・Simon Willisonの個人ブログ)が使う典型的なタグのみを
// 正規表現で拾う簡易パーサー(要件はXMLパーサーの実装方法を定めていないため設計判断。
// フィード構造が大きく変わった場合は個別に対応する)
function parseFeedEntries(xml: string): { title: string; link: string; publishedAt: string }[] {
  const entries: { title: string; link: string; publishedAt: string }[] = []
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/g) ?? []

  for (const block of blocks) {
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim()
    const rssLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
    const atomLink = block.match(/<link[^>]*href="([^"]+)"/)?.[1]?.trim()
    const link = rssLink || atomLink
    const publishedAt = block
      .match(/<(?:pubDate|updated|published)>([\s\S]*?)<\/(?:pubDate|updated|published)>/)?.[1]
      ?.trim()

    if (title && link && publishedAt) entries.push({ title, link, publishedAt: new Date(publishedAt).toISOString() })
  }

  return entries
}

// 公式組織のブログ・Simon Willisonの個人ブログの公式RSS/Atomフィードから新着記事を取得する
export async function fetchRssCandidates(entry: WatchlistEntry, http: HttpClient): Promise<Candidate[]> {
  const feedUrl = entry.channels.find((c) => c.type === 'rss')?.feedUrl
  if (!feedUrl) return []

  const xml = await http.fetchText(feedUrl)
  const entries = parseFeedEntries(xml)
  const sourceType: SourceType = entry.category === 'official' ? 'official' : 'individual-blog'

  return entries.map((e) => ({
    sourceId: entry.id,
    sourceName: entry.name,
    sourceType,
    heading: e.title,
    url: e.link,
    publishedAt: e.publishedAt,
    metricValue: 0, // official/individual-blogは常に基準を満たすため判定に使わない
  }))
}

type QiitaItem = { title?: string; url?: string; likes_count?: number; created_at?: string; user?: { name?: string } }

// Qiita公式APIから新着記事といいね数を取得する(requirements.md#採用基準-7)
export async function fetchQiitaCandidates(http: HttpClient): Promise<Candidate[]> {
  const url = 'https://qiita.com/api/v2/items?page=1&per_page=20'
  const items = (await http.fetchJson(url)) as QiitaItem[]

  return items
    .filter((item): item is Required<Pick<QiitaItem, 'title' | 'url' | 'created_at'>> & QiitaItem =>
      Boolean(item.title && item.url && item.created_at)
    )
    .map((item) => ({
      sourceId: 'qiita',
      sourceName: item.user?.name ?? 'Qiita',
      sourceType: 'qiita' as const,
      heading: item.title,
      url: item.url,
      publishedAt: new Date(item.created_at).toISOString(),
      metricValue: item.likes_count ?? 0,
    }))
}

// Zennの公開ページ(HTML)からいいね数の表示値を読み取る。Zennには公式のいいね数取得APIが
// なく、非公式APIの利用は避ける方針のため、要約のためにどのみち開く公開ページの表示値を使う
// (requirements.md#採用基準-8)。ページ構造が変わり読み取れない場合はundefinedを返し、
// 呼び出し元でその記事を候補から除外する(design.md「エラーハンドリング」)
function extractZennLikeCount(html: string): number | undefined {
  const match = html.match(/"likedCount"\s*:\s*(\d+)/)
  return match ? Number(match[1]) : undefined
}

// Zenn公式RSSフィードで新着記事を検知し、各記事の公開ページからいいね数を読み取る
export async function fetchZennCandidates(http: HttpClient): Promise<Candidate[]> {
  const feedXml = await http.fetchText('https://zenn.dev/feed')
  const entries = parseFeedEntries(feedXml)

  const candidates: Candidate[] = []
  for (const entry of entries) {
    const html = await http.fetchText(entry.link)
    const likeCount = extractZennLikeCount(html)
    // いいね数を読み取れない記事は、誤った数値で誤判定するより除外する方が安全なため候補にしない
    if (likeCount === undefined) continue

    candidates.push({
      sourceId: 'zenn',
      sourceName: 'Zenn',
      sourceType: 'zenn',
      heading: entry.title,
      url: entry.link,
      publishedAt: entry.publishedAt,
      metricValue: likeCount,
    })
  }

  return candidates
}

// ウォッチリスト全体から候補を収集する。1つの情報源の取得に失敗しても、その情報源だけを
// 除外して他の情報源の結果は返す(design.md「情報源から候補を収集する処理」手順2。
// 1件の取得失敗で日次実行全体を止めない)
export async function fetchAllCandidates(
  watchlist: WatchlistEntry[],
  criteria: Criteria,
  apiKey: string,
  http: HttpClient
): Promise<Candidate[]> {
  const tasks: Promise<Candidate[]>[] = []

  for (const entry of watchlist) {
    for (const channel of entry.channels) {
      if (channel.type === 'youtube') tasks.push(fetchYoutubeCandidates(entry, apiKey, criteria, http))
      if (channel.type === 'rss') tasks.push(fetchRssCandidates(entry, http))
      if (channel.type === 'platform-qiita') tasks.push(fetchQiitaCandidates(http))
      if (channel.type === 'platform-zenn') tasks.push(fetchZennCandidates(http))
    }
  }

  const results = await Promise.allSettled(tasks)
  return results.filter((r): r is PromiseFulfilledResult<Candidate[]> => r.status === 'fulfilled').flatMap((r) => r.value)
}
