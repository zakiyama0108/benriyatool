// 公開ページのHTTP取得・情報源のformat別ディスパッチ(仕様: requirements.md#データ取得方法-2、
// design.md「固定リストジャンルの候補を収集・判定する処理」手順1)。
// 一般的なブラウザのUser-Agentを付与し(Bot判定回避目的の偽装ではなく、User-Agent未設定を理由に
// 一律ブロックするサイトへの通常アクセスのため)、文字コードはページのContent-Type/meta指定に従って
// 変換する(Shift-JIS等のページをUTF-8決め打ちで読まない)。
//
// dispatchFixedListSourceが、情報源のformatに応じてサイトごとの専用パース
// (scripts/trend-digest/sourceParsers/)・構造化データの取得(scripts/trend-digest/
// fetchStructuredSource.ts)への振り分けを行う(design.md「固定リストジャンルの候補を収集・
// 判定する処理」手順1)。これがapp/trend-digest/lib/fetchFixedListCandidates.tsへ注入する
// 実際のSourceFetcher実装になる(collect-and-select.tsから利用する)
import type { WatchlistEntry } from '../../app/trend-digest/lib/watchlistTypes'
import type { Genre } from '../../app/trend-digest/lib/types'
import type { SourceFetchResult } from '../../app/trend-digest/lib/fetchFixedListCandidates'
import { billboardJapan } from './sourceParsers/billboardJapan'
import { kogyoTsushin } from './sourceParsers/kogyoTsushin'
import { eigaCom } from './sourceParsers/eigaCom'
import { filmarks } from './sourceParsers/filmarks'
import { videoResearchDrama, videoResearchVariety } from './sourceParsers/videoResearch'
import { tohan } from './sourceParsers/tohan'
import { nippan } from './sourceParsers/nippan'
import { famitsu } from './sourceParsers/famitsu'
import { jalan } from './sourceParsers/jalan'
import {
  parseNetflixTsv,
  parseGoogleTrendsRss,
  parseSteamMostPlayed,
  resolveSteamRanking,
  type NetflixCategory,
  type SteamAppNameFetcher,
} from './fetchStructuredSource'

// 一般的なブラウザのUser-Agent(requirements.md#データ取得方法-2)
export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// Content-Typeヘッダーのcharsetパラメータを読み取る(design.md手順1)
function charsetFromContentType(contentType: string | null): string | null {
  if (!contentType) return null
  const match = contentType.match(/charset=["']?([^"';]+)/i)
  return match ? match[1].trim().toLowerCase() : null
}

// <meta charset="..."> または <meta http-equiv="Content-Type" content="...charset=..."> から
// 文字コードを読み取る(Content-Typeヘッダーにcharsetがないページ向け)。メタタグはASCII互換の
// 範囲に収まるため、いったんASCIIとして粗くデコードしても文字コード名自体は読み取れる
function charsetFromMetaTag(bytes: Uint8Array): string | null {
  const head = new TextDecoder('ascii').decode(bytes.slice(0, 2048))
  const metaCharset = head.match(/<meta[^>]+charset=["']?([^"';>\s]+)/i)
  if (metaCharset) return metaCharset[1].trim().toLowerCase()
  const httpEquiv = head.match(/<meta[^>]+content=["'][^"']*charset=([^"';\s]+)/i)
  return httpEquiv ? httpEquiv[1].trim().toLowerCase() : null
}

// Content-Type/metaのcharset指定に従ってHTMLをデコードする(design.md手順1)。
// どちらにも指定がない場合はUTF-8として扱う(現在の大半のサイトの既定)
export function decodeHtml(buffer: ArrayBuffer, contentTypeHeader: string | null): string {
  const bytes = new Uint8Array(buffer)
  const charset = charsetFromContentType(contentTypeHeader) ?? charsetFromMetaTag(bytes) ?? 'utf-8'
  try {
    return new TextDecoder(charset).decode(bytes)
  } catch {
    // 未知の文字コード名が指定されていた場合はUTF-8として読む(文字が壊れるより読める方を優先する)
    return new TextDecoder('utf-8').decode(bytes)
  }
}

// 公開ページを取得し、文字コードを正しく変換したHTML文字列を返す
export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': BROWSER_USER_AGENT } })
  if (!res.ok) throw new Error(`${url} の取得に失敗しました(status: ${res.status})`)
  const buffer = await res.arrayBuffer()
  return decodeHtml(buffer, res.headers.get('content-type'))
}

// site-specific-htmlのparserIdからパース関数を引く辞書。videoResearchは1ファイルで
// ドラマ・バラエティの2関数を持つため、parserIdもそれぞれ別の名前(videoResearchDrama/
// videoResearchVariety)にしている(design.md「サイトごとの専用パーサー」)
const HTML_PARSERS: Record<string, (html: string) => ReturnType<typeof billboardJapan>> = {
  billboardJapan,
  kogyoTsushin,
  eigaCom,
  filmarks,
  videoResearchDrama,
  videoResearchVariety,
  tohan,
  nippan,
  famitsu,
  jalan,
}

// Netflix公式Top10データ(structured-tsv)のcategory列は"Films"/"TV"の2種類のみで、アニメ専用の
// 区分が存在しない(fetchStructuredSource.tsのコメント参照)。foreign-drama(TV)・
// streaming-video(Films)はこのマップで機械的に区別できるが、animeジャンルをこのデータから
// 区別する基準が無いため、意図的にマップへ含めていない(source-reviewでの検討事項。
// tasks.md Task14完了報告で報告済み)
const NETFLIX_CATEGORY_BY_GENRE: Partial<Record<Genre, NetflixCategory>> = {
  'foreign-drama': 'TV',
  'streaming-video': 'Films',
}

// Steamのappid→ゲーム名解決は、1呼び出しにつきappid1件のみ解決できるAPIのため上位何件までに
// 限定するか(design.md「関連するファイル」fetchStructuredSource.ts参照)。gamesのrankThreshold
// (10)より十分広い範囲を確保しつつ、週次実行での追加HTTP呼び出し数を抑える
const STEAM_NAME_RESOLUTION_LIMIT = 15

// appidからゲーム名を解決する(store.steampowered.com/api/appdetails。1呼び出しにつきappid1件のみ)。
// 404・解体済みタイトル等で取得できない場合はnullを返す(架空の名前を作らない)
const fetchSteamAppName: SteamAppNameFetcher = async (appid) => {
  const res = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=basic`, {
    headers: { 'User-Agent': BROWSER_USER_AGENT },
  })
  if (!res.ok) return null
  const data = (await res.json()) as Record<string, { success?: boolean; data?: { name?: string } }>
  const entry = data[String(appid)]
  const name = entry?.success ? entry.data?.name : undefined
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : null
}

// 情報源1件を、formatに応じてサイトごとの専用パースまたは構造化データの取得・パースへ振り分ける
// (design.md「固定リストジャンルの候補を収集・判定する処理」手順1)。app/trend-digest/lib/
// fetchFixedListCandidates.tsのSourceFetcherとして注入する(collect-and-select.tsから利用する)
export async function dispatchFixedListSource(
  source: WatchlistEntry['sources'][number],
  genre: Genre
): Promise<SourceFetchResult> {
  switch (source.format) {
    case 'site-specific-html': {
      const parser = source.parserId ? HTML_PARSERS[source.parserId] : undefined
      if (!parser) throw new Error(`情報源「${source.name}」のparserId「${source.parserId}」に対応するパーサーがありません`)
      const html = await fetchHtml(source.url)
      const items = parser(html)
      return { providesRankChange: items.some((i) => i.previousRank !== undefined || i.isNew === true), items }
    }
    case 'structured-tsv': {
      const category = NETFLIX_CATEGORY_BY_GENRE[genre]
      if (!category) {
        throw new Error(
          `ジャンル「${genre}」はNetflix公式Top10データ(structured-tsv)のcategory("Films"/"TV")に` +
            '対応付けられていません(Netflixの公開データにはアニメ専用の区分が存在しないため。source-reviewでの検討事項)'
        )
      }
      const tsv = await fetchHtml(source.url)
      const items = parseNetflixTsv(tsv, 'Japan', category)
      return { providesRankChange: true, items }
    }
    case 'structured-rss': {
      const xml = await fetchHtml(source.url)
      const items = parseGoogleTrendsRss(xml)
      return { providesRankChange: false, items }
    }
    case 'structured-json-api': {
      const json = await fetchHtml(source.url)
      const ranks = parseSteamMostPlayed(json)
      const items = await resolveSteamRanking(ranks, fetchSteamAppName, STEAM_NAME_RESOLUTION_LIMIT)
      return { providesRankChange: items.some((i) => i.previousRank !== undefined), items }
    }
    default:
      throw new Error(`情報源「${source.name}」のformatが不明です`)
  }
}
