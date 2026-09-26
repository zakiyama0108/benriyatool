// 情報源(公開ページ)の取得・パース(仕様: design.md「固定リストジャンルの候補を収集・判定する処理」手順1)。
// TDD対象外(ai-dev-digestのfetchHttpClientと同じ、実HTTP通信そのものを行う本番用の薄い実装のため。
// app/trend-digest/lib/fetchFixedListCandidates.tsの判定ロジックはSourceFetcherを注入してテスト済み)。
//
// watchlist.jsonが登録する情報源(Oricon・Billboard JAPAN・Filmarks・Netflix公式Top10・トーハン・
// Googleトレンド・WWD JAPAN・ZOZOTOWN・価格.com・Engadget・Steam・ファミ通.com・じゃらんnet・
// るるぶ&more!等)は、各社が公式にJSON/CSV APIを提供していない公開ページが大半のため、汎用的な
// 見出し付きリスト/テーブルのパターンを最善努力で抽出する。個別サイトの正確なHTML構造の検証は
// 実際の疎通確認(週次実行結果)で代替する(design.md「関連するファイル(抜粋)」参照)。慢性的に
// 0件が続く情報源は、requirements.md#情報源の健全性監視-1に従いsource-reviewの月次見直しで
// 個別のセレクタ調整・情報源の見直しを行う運用とする
import type { SourceFetchResult, RankedItem, NewArticleItem } from '../../app/trend-digest/lib/fetchFixedListCandidates'

// design.mdが名指しする「新着記事一覧型」の情報源(順位を持たないため、順位付きランキング型とは
// 別の抽出処理になる。design.md「固定リストジャンルの候補を収集・判定する処理」手順1)
const NEW_ARTICLE_LIST_SOURCE_NAMES = new Set(['WWD JAPAN新着記事', 'Engadget日本版'])

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// <li>...</li>または<tr>...</tr>の各ブロックから、先頭の数字(順位)とタイトルらしきテキストを
// 抽出する汎用パーサー。前週比(前週順位・NEW表記)が見つかった項目が1件でもあれば、
// そのページは前週比データを提供しているとみなす(design.md手順2)
export function parseRankedListHtml(html: string): { providesRankChange: boolean; items: RankedItem[] } {
  const blocks = html.match(/<(li|tr)\b[\s\S]*?<\/\1>/gi) ?? []
  const items: RankedItem[] = []
  let providesRankChange = false

  for (const block of blocks) {
    const text = stripTags(block)
    const rankMatch = text.match(/^(\d{1,3})[.\s、]+(.+)$/)
    if (!rankMatch) continue
    const currentRank = Number(rankMatch[1])
    const title = rankMatch[2].trim()
    if (!title) continue

    const isNew = /\bNEW\b/i.test(block)
    const prevMatch = block.match(/(?:前週|prev(?:ious)?)[^\d]{0,10}(\d{1,3})/i)
    const previousRank = prevMatch ? Number(prevMatch[1]) : undefined
    if (isNew || previousRank !== undefined) providesRankChange = true

    items.push({
      title,
      currentRank,
      ...(isNew ? { isNew: true } : {}),
      ...(previousRank !== undefined ? { previousRank } : {}),
    })
  }

  return { providesRankChange, items }
}

// <li>...</li>または<article>...</article>の各ブロックを新着記事1件とみなす汎用パーサー
export function parseNewArticleListHtml(html: string): NewArticleItem[] {
  const blocks = html.match(/<(li|article)\b[\s\S]*?<\/\1>/gi) ?? []
  const items: NewArticleItem[] = []
  for (const block of blocks) {
    const title = stripTags(block)
    if (!title) continue
    const dateMatch = block.match(/<time[^>]*datetime="([^"]+)"/i)
    items.push({ title, publishedAt: dateMatch ? dateMatch[1] : new Date().toISOString() })
  }
  return items
}

export async function fetchSourcePage(source: { name: string; url: string }): Promise<SourceFetchResult> {
  const res = await fetch(source.url)
  if (!res.ok) throw new Error(`${source.url} の取得に失敗しました(status: ${res.status})`)
  const html = await res.text()

  if (NEW_ARTICLE_LIST_SOURCE_NAMES.has(source.name)) {
    return { kind: 'new-articles', items: parseNewArticleListHtml(html) }
  }
  const { providesRankChange, items } = parseRankedListHtml(html)
  return { kind: 'ranked', providesRankChange, items }
}
