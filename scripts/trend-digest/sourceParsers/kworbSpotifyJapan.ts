// kworb.net Spotify Japanデイリーチャートの専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// 音楽ジャンルの情報源の1つ(watchlist.json「kworb.net Spotify Japanデイリーチャート」)。
//
// HTML構造(2026-10-20時点で実際に取得して確認): `<table id="spotifydaily">`の各行(`<tr>`)が
// 1曲に対応する。順位は最初の`<td class="np">`、曲名は`<td class="text mp">`内のリンクの
// テキスト(アーティスト名・曲名を`<a>`タグで個別に持つ)を連結したもの。このページはデイリー
// チャート(日次更新)で、週2回しか取得しない本スクリプトでは「前日比」の列(2列目)が週次の
// 変動と対応しないため使わない。新規ランクイン判定は他の情報源と同様、過去記事との突き合わせに
// 委ねる(design.md「固定リストジャンルの候補を収集・判定する処理」手順3)
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function kworbSpotifyJapan(html: string): RankedItem[] {
  const table = html.match(/<table[^>]*id="spotifydaily"[^>]*>[\s\S]*?<\/table>/)
  if (!table) return []

  const items: RankedItem[] = []
  const rows = table[0].match(/<tr>[\s\S]*?<\/tr>/g) ?? []
  for (const row of rows) {
    const rankMatch = row.match(/<td class="np">(\d+)<\/td>/)
    const titleCellMatch = row.match(/<td class="text mp">([\s\S]*?)<\/td>/)
    if (!rankMatch || !titleCellMatch) continue

    const title = titleCellMatch[1]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (!title) continue

    items.push({ title, currentRank: Number(rankMatch[1]) })
  }
  return items
}
