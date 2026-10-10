// 興行通信社CINEMAランキング通信の専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// 日本映画ジャンルの主たる情報源(watchlist.json「興行通信社CINEMAランキング通信(国内)」)。
//
// トップページ(kogyotsushin.com/)には週末ランキング表がなく、`archives/weekend/`配下の
// 「今週の映画ランキング」ページに実際のランキング表がある(design.mdの補足「ビデオリサーチのURL」
// 相当の訂正をkogyoTsushinについても行った上での実装)。1作品ごとに`<dl>`ブロックがあり、
// 現在順位は`<img alt="N位">`、前週比の方向は`<img alt="STAY|NEW|UP|DOWN">`、
// 前週順位は`(N)`または新規の場合`(-)`、作品タイトルは`<dd class="txt"><a>タイトル</a>`から読み取る
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function kogyoTsushin(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const blocks = html.match(/<dl><dt class="xs">[\s\S]*?<\/dl>/g) ?? []

  for (const block of blocks) {
    const rankMatch = block.match(/alt="(\d+)位"/)
    const titleMatch = block.match(/<dd class="txt"><a[^>]*>([^<]+)<\/a>/)
    if (!rankMatch || !titleMatch) continue
    const title = titleMatch[1].trim()
    if (!title) continue

    const item: RankedItem = { title, currentRank: Number(rankMatch[1]) }
    const dirMatch = block.match(/alt="(STAY|NEW|UP|DOWN)"/)
    const prevMatch = block.match(/\((\d+|-)\)<\/dt>/)
    if (dirMatch?.[1] === 'NEW' || prevMatch?.[1] === '-') {
      item.isNew = true
    } else if (prevMatch && /^\d+$/.test(prevMatch[1])) {
      item.previousRank = Number(prevMatch[1])
    }
    items.push(item)
  }

  return items
}
