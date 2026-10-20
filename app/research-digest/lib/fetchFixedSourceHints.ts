// 固定情報源からの新着取得(仕様: content-selection/requirements.md#情報源(固定リスト)-1、
// content-selection/design.md「固定情報源からヒントを集める処理」)。外部通信を伴うため、
// レスポンス形状のパース・エラー処理のみをモックしたテストの対象とする。実際の外部通信は
// HttpClientとして注入し、実装コード自体はfetch()を直接呼ばない(news-digestのfetchCandidates.ts
// と同じ考え方。実運用ではfetch()を使う実装をscripts側で注入する)
import type { FixedSourceEntry, FixedSourceHint } from './fixedSourceTypes'

export type HttpClient = {
  fetchText: (url: string) => Promise<string>
}

// 一般的なブラウザのUser-Agent(ボット判定回避目的の偽装ではなく、User-Agent未設定を理由に
// 一律ブロックするサイトへの通常アクセスのため。trend-digestのBROWSER_USER_AGENTと同じ考え方)
export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// 1サイトの応答なしで収集処理全体が止まるのを防ぐための上限(/fixで追加)
const FETCH_TIMEOUT_MS = 20_000

// fetch()をそのまま使う本番用HttpClient(scripts/research-digest/collect-and-select.tsから利用)
export const fetchHttpClient: HttpClient = {
  async fetchText(url) {
    const res = await fetch(url, { headers: { 'User-Agent': BROWSER_USER_AGENT }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!res.ok) throw new Error(`${url} の取得に失敗しました(status: ${res.status})`)
    return res.text()
  },
}

export type RawFixedSourceItem = { title: string; url: string; publishedAt: string | null }

// site-specific-html向けの専用パーサーの辞書(parserId → パース関数)。
// app/research-digest/lib/fixedSourceParsers.tsの実装を注入する(テストではモックを渡す)
export type HtmlParsers = Record<string, (html: string) => RawFixedSourceItem[]>

// 情報源あたりの取得件数の上限(design.md「固定情報源からヒントを集める処理」手順1。
// プロンプトの肥大化を防ぐ。発表の時期は問わないため期間での絞り込みは行わない)
const MAX_HINTS_PER_SOURCE = 10

// プロンプトに埋め込む前の文字数上限(design.md「セキュリティ」)
const MAX_TITLE_LENGTH = 200

// &amp;等のHTML実体参照をデコードする(主要な名前付き参照+数値参照)。フィード配信元が
// タイトル・URLにエスケープした文字をそのまま埋め込むことがあるため、生のまま残さない
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
}

// Atomの<link>要素からリンク先を抜き出す。rel="alternate"を最優先し(rel省略時もAtom仕様上
// alternate扱いのため次点)、rel="self"(フィード自身のAPI用URL)等を誤って拾わないようにする
function extractAtomLink(block: string): string | undefined {
  const tags = block.match(/<link\b[^>]*\/?>/g) ?? []
  const candidates = tags
    .map((tag) => ({ href: tag.match(/href="([^"]*)"/)?.[1], rel: tag.match(/rel="([^"]*)"/)?.[1] }))
    .filter((c): c is { href: string; rel: string | undefined } => Boolean(c.href))

  return (
    candidates.find((c) => c.rel === 'alternate')?.href ??
    candidates.find((c) => c.rel === undefined)?.href ??
    candidates[0]?.href
  )
}

// RSS/Atom/RDFの<item>/<entry>を雑駁に抽出する(news-digestのparseFeedEntriesと同じ考え方の簡易パーサー)
function parseFeedItems(xml: string): RawFixedSourceItem[] {
  const items: RawFixedSourceItem[] = []
  const blocks = xml.match(/<(item|entry)\b[\s\S]*?<\/\1>/g) ?? []

  for (const block of blocks) {
    const rawTitle = block.match(/<title[^>]*>\s*(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?\s*<\/title>/)?.[1]?.trim()
    const title = rawTitle ? decodeHtmlEntities(rawTitle) : undefined
    const rssLink = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
    const rdfLink = block.match(/rdf:about="([^"]+)"/)?.[1]?.trim()
    const rawUrl = rssLink || extractAtomLink(block) || rdfLink
    const url = rawUrl ? decodeHtmlEntities(rawUrl) : undefined
    const dateText = block.match(/<(?:pubDate|updated|published|dc:date)>([\s\S]*?)<\/(?:pubDate|updated|published|dc:date)>/)?.[1]?.trim()
    const parsedDate = dateText ? new Date(dateText) : null
    const publishedAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : null

    if (title && url) {
      items.push({ title, url, publishedAt })
    }
  }

  return items
}

// 制御文字を除き、長さの上限で切り詰め、http/https以外のURLは候補から除く
// (design.md「セキュリティ」。プロンプトインジェクション・異常に長い文字列の混入を防ぐ)
function sanitizeHint(sourceName: string, raw: RawFixedSourceItem): FixedSourceHint | null {
  const title = raw.title
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .slice(0, MAX_TITLE_LENGTH)
  if (title === '') return null
  if (!/^https?:\/\//.test(raw.url)) return null
  return { sourceName, title, url: raw.url, publishedAt: raw.publishedAt }
}

export type SourceFetchStat = { sourceName: string; ok: boolean; count: number }

// 対象ジャンルの固定情報源すべてから新着のヒントを取得する(design.md「固定情報源からヒントを
// 集める処理」)。1つの情報源の取得に失敗しても、その情報源だけを除外して他の情報源の結果は返す
// (requirements.md#データ取得方法-2。1件の取得失敗でそのジャンルの収集処理自体は止めない)
export async function fetchGenreHints(
  genreId: string,
  entries: FixedSourceEntry[],
  http: HttpClient,
  htmlParsers: HtmlParsers,
): Promise<{ hints: FixedSourceHint[]; stats: SourceFetchStat[] }> {
  const targets = entries.filter((e) => e.genreId === genreId)

  const results = await Promise.allSettled(
    targets.map(async (entry) => {
      const text = await http.fetchText(entry.channel.url)
      const rawItems =
        entry.channel.type === 'feed'
          ? parseFeedItems(text)
          : (() => {
              const parser = htmlParsers[entry.channel.parserId]
              if (!parser) throw new Error(`情報源「${entry.name}」のparserId「${entry.channel.parserId}」に対応するパーサーがありません`)
              return parser(text)
            })()

      const hints = rawItems
        .map((item) => sanitizeHint(entry.name, item))
        .filter((h): h is FixedSourceHint => h !== null)
        .slice(0, MAX_HINTS_PER_SOURCE)
      return { name: entry.name, hints }
    }),
  )

  const hints: FixedSourceHint[] = []
  const stats: SourceFetchStat[] = []
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      hints.push(...result.value.hints)
      stats.push({ sourceName: result.value.name, ok: true, count: result.value.hints.length })
    } else {
      stats.push({ sourceName: targets[i].name, ok: false, count: 0 })
    }
  })

  return { hints, stats }
}

// 固定情報源ごとの取得件数を、月次見直し用の実行ログ行に整形する(requirements.md#収集状況の記録-2)。
// 取得失敗・0件だった情報源はWARN付きにして無言停止に気づけるようにする(news-digestと同じ考え方)
export function buildFixedSourceHealthLogLines(stats: SourceFetchStat[]): string[] {
  return stats.map((s) => {
    const body = `${s.sourceName}: ${s.ok ? `${s.count}件` : '取得失敗'}`
    return s.ok && s.count > 0 ? body : `WARN ${body}`
  })
}
