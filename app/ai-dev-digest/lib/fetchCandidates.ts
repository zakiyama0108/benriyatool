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

// 情報源ごとの収集件数(requirements.md#情報源の健全性監視-2、design.md「ログ」)。
// フィード廃止・URL変更で無言停止した情報源を月次見直しで拾えるようにするため、
// fetchAllCandidatesがチャンネル単位で件数・取得成否を集計して返す
export type SourceCollectionStat = {
  sourceId: string
  sourceName: string
  channel: 'youtube' | 'rss' | 'qiita' | 'zenn'
  ok: boolean // フィード/APIの取得自体に成功したか(失敗時はその情報源だけ除外して続行)
  count: number // 収集できた候補件数
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
// - 公式組織(official): 最新1本のみを候補にする(発信量が少なく信頼性が高いため。requirements.md#採用基準-4)
// - 個人YouTube(individual-youtube): 直近youtubeCandidateVideoCount本それぞれを候補にする。
//   投稿直後で再生数が伸びていない動画しか判定できない問題を避けるため、最新1本ではなく直近数本を
//   まとめて評価する(requirements.md#採用基準-5)。平均再生回数は「候補群を除いた直後の
//   youtubeRecentVideoWindow本」で算出し、全候補が同じ平均値を基準にする(design.md「採用基準を判定する処理」手順2)
export async function fetchYoutubeCandidates(
  entry: WatchlistEntry,
  apiKey: string,
  criteria: Criteria,
  http: HttpClient
): Promise<Candidate[]> {
  const handle = entry.channels.find((c) => c.type === 'youtube')?.channelId
  if (!handle) return []

  const channelId = await resolveYoutubeChannelId(handle, apiKey, http)

  const isIndividual = entry.category === 'individual-youtube'
  // 個人YouTubeは「直近candidateCount本を候補」+「その直後window本を平均算出対象」で取得する。
  // 公式組織は最新1本のみのため平均算出対象を取らない
  const candidateCount = isIndividual ? criteria.youtubeCandidateVideoCount : 1
  const windowCount = isIndividual ? criteria.youtubeRecentVideoWindow : 0
  const maxResults = candidateCount + windowCount

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=${maxResults}&type=video&key=${apiKey}`
  const searchData = (await http.fetchJson(searchUrl)) as YoutubeSearchResponse
  const videos = (searchData.items ?? [])
    .map((item) => ({ videoId: item.id?.videoId, title: item.snippet?.title, publishedAt: item.snippet?.publishedAt }))
    .filter((v): v is { videoId: string; title: string; publishedAt: string } => Boolean(v.videoId && v.title && v.publishedAt))

  if (videos.length === 0) return []

  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videos.map((v) => v.videoId).join(',')}&key=${apiKey}`
  const statsData = (await http.fetchJson(statsUrl)) as YoutubeVideosResponse
  const viewCountById = new Map((statsData.items ?? []).map((item) => [item.id, Number(item.statistics?.viewCount ?? 0)]))

  const candidateVideos = videos.slice(0, candidateCount)
  const poolVideos = videos.slice(candidateCount, candidateCount + windowCount)

  // 平均対象が取得できた本数だけ少ない場合は取得できた範囲で平均する。0本のときは平均0として扱う
  // (再生数1以上なら採用候補になる。既存の最新1本評価時の挙動を踏襲。design.md「採用基準を判定する処理」手順2)
  const recentAverageViews = isIndividual
    ? poolVideos.length > 0
      ? poolVideos.reduce((sum, v) => sum + (viewCountById.get(v.videoId) ?? 0), 0) / poolVideos.length
      : 0
    : undefined

  const sourceType: SourceType = entry.category === 'official' ? 'official' : 'individual-youtube'

  return candidateVideos.map((video) => ({
    sourceId: entry.id,
    sourceName: entry.name,
    sourceType,
    heading: video.title,
    url: `https://www.youtube.com/watch?v=${video.videoId}`,
    publishedAt: video.publishedAt,
    metricValue: viewCountById.get(video.videoId) ?? 0,
    ...(recentAverageViews !== undefined ? { recentAverageViews } : {}),
  }))
}

// RSS/Atomフィードの<item>/<entry>を雑駁に抽出する。外部ライブラリを追加せず、
// 対象情報源(公式組織のブログ・個人ブログ)が使う典型的なタグのみを正規表現で拾う簡易パーサー
// (要件はXMLパーサーの実装方法を定めていないため設計判断。フィード構造が大きく変わった場合は個別に対応する)。
// 個人ブログの本文量による除外(requirements.md#採用基準-6)のため、本文のタグ除去後の文字数も併せて返す
type FeedEntry = { title: string; link: string; publishedAt: string; bodyChars: number }

// content:encoded / summary / description / atomのcontent からHTMLタグを除いた本文文字数を数える
function extractBodyChars(block: string): number {
  const bodyMatch =
    block.match(/<content:encoded[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content:encoded>/) ??
    block.match(/<content\b[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/) ??
    block.match(/<summary\b[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/) ??
    block.match(/<description\b[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)
  const raw = bodyMatch?.[1] ?? ''
  return raw
    .replace(/<[^>]*>/g, '') // HTMLタグを除去
    .replace(/&[a-z]+;|&#\d+;/gi, ' ') // 実体参照は1文字幅とみなす
    .replace(/\s+/g, ' ')
    .trim().length
}

function parseFeedEntries(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = []
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/g) ?? []

  for (const block of blocks) {
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim()
    const rssLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
    const atomLink = block.match(/<link[^>]*href="([^"]+)"/)?.[1]?.trim()
    const link = rssLink || atomLink
    const publishedAt = block
      .match(/<(?:pubDate|updated|published)>([\s\S]*?)<\/(?:pubDate|updated|published)>/)?.[1]
      ?.trim()

    if (title && link && publishedAt) {
      entries.push({
        title,
        link,
        publishedAt: new Date(publishedAt).toISOString(),
        bodyChars: extractBodyChars(block),
      })
    }
  }

  return entries
}

// 個人ブログ投稿を本文量不足で候補から除外したことの記録(design.md「ログ」)。
// 呼び出し元(collect-and-select.ts)が件数と元URLを標準エラー出力に記録し、
// 短い正当な投稿(引用・リンク論評など)を巻き込んでいないかを月次見直しで検証できるようにする
export type ShortBodyExclusion = { sourceId: string; sourceName: string; url: string; bodyChars: number }

// 公式組織のブログ・個人ブログの公式RSS/Atomフィードから新着記事を取得する。
// 個人ブログ(individual-blog)は、フィード本文のタグ除去後の文字数がminIndividualBlogBodyChars未満の
// 投稿を、要約に足る情報がないためこの時点で候補から除外する(requirements.md#採用基準-6。
// 主目的はポッドキャスト回の告知など本文がほぼ無い投稿の除外)。公式組織のブログは本文量で除外しない。
// 除外した投稿はshortBodyExclusionsで呼び出し元に返し、呼び出し元がstderrに記録する
export async function fetchRssCandidates(
  entry: WatchlistEntry,
  criteria: Criteria,
  http: HttpClient
): Promise<{ candidates: Candidate[]; shortBodyExclusions: ShortBodyExclusion[] }> {
  const feedUrl = entry.channels.find((c) => c.type === 'rss')?.feedUrl
  if (!feedUrl) return { candidates: [], shortBodyExclusions: [] }

  const xml = await http.fetchText(feedUrl)
  const entries = parseFeedEntries(xml)
  const sourceType: SourceType = entry.category === 'official' ? 'official' : 'individual-blog'

  let kept = entries
  const shortBodyExclusions: ShortBodyExclusion[] = []
  if (sourceType === 'individual-blog') {
    kept = entries.filter((e) => e.bodyChars >= criteria.minIndividualBlogBodyChars)
    for (const e of entries.filter((e) => e.bodyChars < criteria.minIndividualBlogBodyChars)) {
      shortBodyExclusions.push({ sourceId: entry.id, sourceName: entry.name, url: e.link, bodyChars: e.bodyChars })
    }
  }

  const candidates = kept.map((e) => ({
    sourceId: entry.id,
    sourceName: entry.name,
    sourceType,
    heading: e.title,
    url: e.link,
    publishedAt: e.publishedAt,
    metricValue: 0, // official/individual-blogは常に基準を満たすため判定に使わない
  }))

  return { candidates, shortBodyExclusions }
}

type QiitaItem = { title?: string; url?: string; likes_count?: number; created_at?: string; user?: { name?: string } }

// Qiita公式APIから新着記事といいね数・公開日時を取得する(requirements.md#採用基準-7)。
// 公開が新しい順にページを辿り、qiitaMaxAgeDays日より古い記事に達したら打ち切る。
// いいね数の閾値(qiitaMinLikes)判定は選定処理側で行う
export async function fetchQiitaCandidates(
  http: HttpClient,
  criteria: Criteria,
  now: Date = new Date()
): Promise<Candidate[]> {
  const cutoff = now.getTime() - criteria.qiitaMaxAgeDays * 24 * 60 * 60 * 1000
  const MAX_PAGES = 10 // 1日1回の実行分のみ。過剰なページングを避ける安全弁
  const PER_PAGE = 100
  const candidates: Candidate[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = `https://qiita.com/api/v2/items?page=${page}&per_page=${PER_PAGE}`
    const items = (await http.fetchJson(url)) as QiitaItem[]
    if (!Array.isArray(items) || items.length === 0) break

    let reachedOld = false
    for (const item of items) {
      if (!item.title || !item.url || !item.created_at) continue
      const publishedAt = new Date(item.created_at)
      if (publishedAt.getTime() < cutoff) {
        reachedOld = true
        break
      }
      candidates.push({
        sourceId: 'qiita',
        sourceName: item.user?.name ?? 'Qiita',
        sourceType: 'qiita',
        heading: item.title,
        url: item.url,
        publishedAt: publishedAt.toISOString(),
        metricValue: item.likes_count ?? 0,
      })
    }
    // 期間外に達した、または最終ページに満たない件数なら以降のページは辿らない
    if (reachedOld || items.length < PER_PAGE) break
  }

  return candidates
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

// 情報源ごとの取得件数を、月次見直し用の実行ログ行に整形する(requirements.md#情報源の健全性監視-2、
// design.md「ログ」)。取得失敗・0件だった情報源はWARN付きにして無言停止に気づけるようにする
export function buildSourceHealthLogLines(stats: SourceCollectionStat[]): string[] {
  return stats.map((s) => {
    const body = `${s.sourceName}(${s.channel}): ${s.ok ? `${s.count}件` : '取得失敗'}`
    return s.ok && s.count > 0 ? body : `WARN ${body}`
  })
}

type CollectionTask = {
  sourceId: string
  sourceName: string
  channel: SourceCollectionStat['channel']
  run: () => Promise<Candidate[]>
}

// ウォッチリスト全体から候補を収集する。1つの情報源の取得に失敗しても、その情報源だけを
// 除外して他の情報源の結果は返す(design.md「情報源から候補を収集する処理」手順2。
// 1件の取得失敗で日次実行全体を止めない)。あわせて情報源ごとの取得件数(requirements.md#情報源の健全性監視-2)と、
// 個人ブログの本文量による除外(design.md「ログ」)を集計して返し、呼び出し元がstderrに記録する
export async function fetchAllCandidates(
  watchlist: WatchlistEntry[],
  criteria: Criteria,
  apiKey: string,
  http: HttpClient
): Promise<{ candidates: Candidate[]; stats: SourceCollectionStat[]; shortBodyExclusions: ShortBodyExclusion[] }> {
  const tasks: CollectionTask[] = []
  const shortBodyExclusions: ShortBodyExclusion[] = []

  for (const entry of watchlist) {
    for (const channel of entry.channels) {
      if (channel.type === 'youtube')
        tasks.push({ sourceId: entry.id, sourceName: entry.name, channel: 'youtube', run: () => fetchYoutubeCandidates(entry, apiKey, criteria, http) })
      if (channel.type === 'rss')
        tasks.push({
          sourceId: entry.id,
          sourceName: entry.name,
          channel: 'rss',
          run: async () => {
            const { candidates, shortBodyExclusions: excluded } = await fetchRssCandidates(entry, criteria, http)
            shortBodyExclusions.push(...excluded)
            return candidates
          },
        })
      if (channel.type === 'platform-qiita')
        tasks.push({ sourceId: entry.id, sourceName: entry.name, channel: 'qiita', run: () => fetchQiitaCandidates(http, criteria) })
      if (channel.type === 'platform-zenn')
        tasks.push({ sourceId: entry.id, sourceName: entry.name, channel: 'zenn', run: () => fetchZennCandidates(http) })
    }
  }

  const results = await Promise.allSettled(tasks.map((t) => t.run()))

  const candidates: Candidate[] = []
  const stats: SourceCollectionStat[] = []
  results.forEach((result, i) => {
    const task = tasks[i]
    if (result.status === 'fulfilled') {
      candidates.push(...result.value)
      stats.push({ sourceId: task.sourceId, sourceName: task.sourceName, channel: task.channel, ok: true, count: result.value.length })
    } else {
      stats.push({ sourceId: task.sourceId, sourceName: task.sourceName, channel: task.channel, ok: false, count: 0 })
    }
  })

  return { candidates, stats, shortBodyExclusions }
}
