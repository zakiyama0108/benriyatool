import type { Candidate } from './candidateTypes'
import type { WatchlistEntry } from './watchlistTypes'

// 各情報源への問い合わせ処理(仕様: requirements.md#データ取得方法-1、
// design.md「情報源から候補を収集する処理」)。外部通信を伴うため、レスポンス形状のパース・
// エラー処理のみをモックしたテストの対象とする。実際の外部通信はHttpClientとして注入し、
// 実装コード自体はfetch()を直接呼ばない(テストでモックしやすくするため。実運用では
// fetch()を使う実装をscripts側で注入する)
export type HttpClient = {
  fetchText: (url: string) => Promise<string>
}

// fetch()をそのまま使う本番用HttpClient(scripts/news-digest/collect-and-select.tsから利用)
export const fetchHttpClient: HttpClient = {
  async fetchText(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} の取得に失敗しました(status: ${res.status})`)
    return res.text()
  },
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

type CollectedEntry = { title: string; link: string; publishedAt: string }

// RSS/Atomフィードの<item>/<entry>を雑駁に抽出する。外部ライブラリを追加せず、
// 対象情報源(NHK NEWS WEB・厚生労働省)が使う典型的なタグのみを正規表現で拾う簡易パーサー
// (要件はXMLパーサーの実装方法を定めていないため設計判断。フィード構造が大きく変わった場合は個別に対応する)
function parseFeedEntries(xml: string): CollectedEntry[] {
  const entries: CollectedEntry[] = []
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/g) ?? []

  for (const block of blocks) {
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim()
    const rssLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
    const atomLink = block.match(/<link[^>]*href="([^"]+)"/)?.[1]?.trim()
    const rdfLink = block.match(/rdf:about="([^"]+)"/)?.[1]?.trim()
    const link = rssLink || atomLink || rdfLink
    const publishedAt = block
      .match(/<(?:pubDate|updated|published|dc:date)>([\s\S]*?)<\/(?:pubDate|updated|published|dc:date)>/)?.[1]
      ?.trim()

    if (title && link && publishedAt) {
      const parsedDate = new Date(publishedAt)
      if (!Number.isNaN(parsedDate.getTime())) {
        entries.push({ title, link, publishedAt: parsedDate.toISOString() })
      }
    }
  }

  return entries
}

// 公式RSSがない情報源の公開ページ(HTML)から新着項目を雑駁に抽出する。
// <li>要素の中の<a>タグ(見出し・リンク)と、同じ<li>内に現れる日付らしき文字列
// (YYYY-MM-DD/YYYY/MM/DD/YYYY年M月D日)の組を新着項目とみなす簡易パーサー
// (要件はHTML構造の実装方法を定めていないため設計判断。サイト構造が大きく変わった場合は個別に対応する)
function parseOfficialPageEntries(html: string, baseUrl: string): CollectedEntry[] {
  const entries: CollectedEntry[] = []
  const listItems = html.match(/<li\b[\s\S]*?<\/li>/g) ?? []

  for (const item of listItems) {
    const titleMatch = item.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!titleMatch) continue
    const [, href, rawTitle] = titleMatch
    const title = rawTitle.replace(/<[^>]*>/g, '').trim()
    if (!title) continue

    const dateMatch =
      item.match(/(\d{4})-(\d{1,2})-(\d{1,2})/) ??
      item.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/) ??
      item.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
    if (!dateMatch) continue
    const [, year, month, day] = dateMatch
    const parsedDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00+09:00`)
    if (Number.isNaN(parsedDate.getTime())) continue

    let link: string
    try {
      link = new URL(href, baseUrl).toString()
    } catch {
      continue
    }

    entries.push({ title, link, publishedAt: parsedDate.toISOString() })
  }

  return entries
}

// 直近1週間以内に公開された項目のみを候補として抽出する(requirements.md#データ取得方法-1、
// design.md「情報源から候補を収集する処理」手順1〜2)
function withinLastWeek(publishedAt: string, now: Date): boolean {
  const publishedTime = new Date(publishedAt).getTime()
  return now.getTime() - publishedTime <= ONE_WEEK_MS && publishedTime <= now.getTime()
}

function toCandidates(entries: CollectedEntry[], entry: WatchlistEntry, now: Date): Candidate[] {
  return entries
    .filter((e) => withinLastWeek(e.publishedAt, now))
    .map((e) => ({
      sourceId: entry.id,
      sourceName: entry.name,
      category: entry.category,
      heading: e.title,
      url: e.link,
      publishedAt: e.publishedAt,
    }))
}

export async function fetchRssCandidates(entry: WatchlistEntry, feedUrl: string, http: HttpClient, now: Date): Promise<Candidate[]> {
  const xml = await http.fetchText(feedUrl)
  return toCandidates(parseFeedEntries(xml), entry, now)
}

export async function fetchOfficialPageCandidates(entry: WatchlistEntry, pageUrl: string, http: HttpClient, now: Date): Promise<Candidate[]> {
  const html = await http.fetchText(pageUrl)
  return toCandidates(parseOfficialPageEntries(html, pageUrl), entry, now)
}

// 情報源ごとの収集件数(requirements.md#情報源の健全性監視-3、design.md「ログ」)。
// フィード廃止・URL変更で無言停止した情報源をmonthly-reviewの月次見直しで拾えるようにするため、
// fetchAllCandidatesがチャンネル単位で件数・取得成否を集計して返す
export type SourceCollectionStat = {
  sourceId: string
  sourceName: string
  channel: 'rss' | 'official-page'
  ok: boolean // フィード/ページの取得自体に成功したか(失敗時はその情報源だけ除外して続行)
  count: number // 収集できた候補件数
}

type CollectionTask = {
  sourceId: string
  sourceName: string
  channel: SourceCollectionStat['channel']
  run: () => Promise<Candidate[]>
}

// ウォッチリスト全体から候補を収集する。1つの情報源の取得に失敗しても、その情報源だけを
// 除外して他の情報源の結果は返す(requirements.md#データ取得方法-1、design.md「情報源から
// 候補を収集する処理」手順3。1件の取得失敗で週次実行全体を止めない)。あわせて情報源ごとの
// 取得件数(requirements.md#情報源の健全性監視-3)を集計して返し、呼び出し元がstderrに記録する
export async function fetchAllCandidates(
  watchlist: WatchlistEntry[],
  http: HttpClient,
  now: Date = new Date()
): Promise<{ candidates: Candidate[]; stats: SourceCollectionStat[] }> {
  const tasks: CollectionTask[] = []

  for (const entry of watchlist) {
    for (const channel of entry.channels) {
      if (channel.type === 'rss') {
        tasks.push({
          sourceId: entry.id,
          sourceName: entry.name,
          channel: 'rss',
          run: () => fetchRssCandidates(entry, channel.feedUrl, http, now),
        })
      }
      if (channel.type === 'official-page') {
        tasks.push({
          sourceId: entry.id,
          sourceName: entry.name,
          channel: 'official-page',
          run: () => fetchOfficialPageCandidates(entry, channel.url, http, now),
        })
      }
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

  return { candidates, stats }
}

// 情報源ごとの取得件数を、月次見直し用の実行ログ行に整形する(requirements.md#情報源の健全性監視-3、
// design.md「ログ」)。取得失敗・0件だった情報源はWARN付きにして無言停止に気づけるようにする
export function buildSourceHealthLogLines(stats: SourceCollectionStat[]): string[] {
  return stats.map((s) => {
    const body = `${s.sourceName}(${s.channel}): ${s.ok ? `${s.count}件` : '取得失敗'}`
    return s.ok && s.count > 0 ? body : `WARN ${body}`
  })
}
