import type { FixedSourceEntry, FixedSourceHint } from './fixedSourceTypes'
import { SITE_SPECIFIC_PARSERS, type RawHint } from './fixedSourceParsers'

// 固定情報源からのヒント取得(仕様: content-selection/requirements.md#情報源(固定リスト)-1、
// content-selection/requirements.md#データ取得方法-2、content-selection/design.md「固定情報源から
// ヒントを集める処理」)。外部通信を伴うため、レスポンス形状のパース・エラー処理のみをモックした
// テストの対象とする(news-digestのfetchCandidates.tsと同じ考え方)
export type HttpClient = {
  fetchText: (url: string) => Promise<string>
}

export const fetchHttpClient: HttpClient = {
  async fetchText(url) {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`${url} の取得に失敗しました(status: ${res.status})`)
    return res.text()
  },
}

// 情報源あたりのヒント上限(design.md「固定情報源からヒントを集める処理」手順1。
// プロンプトの肥大化を防ぐため)
const MAX_HINTS_PER_SOURCE = 10

// RSS/Atom/RDFの<item>/<entry>を雑駁に抽出する共通パーサー(news-digestのfetchCandidates.tsの
// parseFeedEntriesと同じ考え方)。本specは記事の公開時期を問わないため(requirements.md#採用基準-3)、
// 期間での絞り込みは行わず、日付が読み取れない項目もpublishedAt: nullとして残す
function parseFeedEntries(xml: string): RawHint[] {
  const entries: RawHint[] = []
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/g) ?? []

  for (const block of blocks) {
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim()
    const rssLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
    const atomLink = block.match(/<link[^>]*href="([^"]+)"/)?.[1]?.trim()
    const rdfLink = block.match(/rdf:about="([^"]+)"/)?.[1]?.trim()
    const url = rssLink || atomLink || rdfLink
    const publishedAt =
      block.match(/<(?:pubDate|updated|published|dc:date)>([\s\S]*?)<\/(?:pubDate|updated|published|dc:date)>/)?.[1]?.trim() ?? null

    if (title && url) {
      entries.push({ title, url, publishedAt })
    }
  }

  return entries
}

function parseEntry(text: string, entry: FixedSourceEntry): RawHint[] {
  if (entry.channel.type === 'feed') {
    return parseFeedEntries(text)
  }
  const parser = SITE_SPECIFIC_PARSERS[entry.channel.parserId]
  if (!parser) {
    throw new Error(`未知のparserIdです: ${entry.channel.parserId}`)
  }
  return parser(text, entry.channel.url)
}

export type FixedSourceFetchFailure = { sourceName: string; message: string }

// 対象ジャンルの固定情報源からヒントを取得する。1件の取得失敗はその情報源だけを除外して続行する
// (design.md「固定情報源からヒントを集める処理」手順2)。対象ジャンルに固定情報源がない場合は
// 空配列を返す。失敗した情報源はfailuresで返し、ログ出力はscripts層に委ねる
// (news-digestのfetchAllCandidates/buildSourceHealthLogLinesと同じ役割分担)
export async function fetchFixedSourceHints(
  entries: FixedSourceEntry[],
  http: HttpClient
): Promise<{ hints: FixedSourceHint[]; failures: FixedSourceFetchFailure[] }> {
  const results = await Promise.allSettled(
    entries.map(async (entry) => {
      const text = await http.fetchText(entry.channel.url)
      const raw = parseEntry(text, entry)
      return raw.slice(0, MAX_HINTS_PER_SOURCE).map((r) => ({ sourceName: entry.name, title: r.title, url: r.url, publishedAt: r.publishedAt }))
    })
  )

  const hints: FixedSourceHint[] = []
  const failures: FixedSourceFetchFailure[] = []
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      hints.push(...result.value)
    } else {
      failures.push({ sourceName: entries[i].name, message: (result.reason as Error).message })
    }
  })
  return { hints, failures }
}

// 情報源ごとの取得件数をログ行に整形する(design.md「固定情報源からヒントを集める処理」手順4、
// design.md「ログ」。news-digestのbuildSourceHealthLogLinesと同じ考え方)。
// 取得失敗・0件だった情報源はWARN付きにして無言停止に気づけるようにする
export function buildFixedSourceHealthLogLines(entries: FixedSourceEntry[], hints: FixedSourceHint[], failures: FixedSourceFetchFailure[]): string[] {
  const failureBySourceName = new Map(failures.map((f) => [f.sourceName, f]))
  return entries.map((entry) => {
    const failure = failureBySourceName.get(entry.name)
    if (failure) {
      return `WARN ${entry.name}: 取得失敗(${failure.message})`
    }
    const count = hints.filter((h) => h.sourceName === entry.name).length
    return count > 0 ? `${entry.name}: ${count}件` : `WARN ${entry.name}: 0件`
  })
}
