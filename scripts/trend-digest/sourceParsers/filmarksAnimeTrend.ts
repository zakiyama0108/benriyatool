// Filmarksアニメ「今話題のおすすめアニメ」の専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// アニメジャンル(併用ジャンル)の固定リスト側の情報源の1つ(watchlist.json
// 「Filmarksアニメ 話題のおすすめアニメ」)。
//
// HTML構造(2026-09-28時点で実際に取得して確認): ページ内に`<script type="application/ld+json">`で
// schema.orgのItemList構造化データが埋め込まれており、`itemListElement`配列の各要素が
// `{"@type":"ListItem","position":順位,"name":"作品名"}`の形。DOM解析より安定しているため、
// このJSON-LDを直接パースする。前週比データはこのページには無いため順位のみを返す
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

type RawListItem = { position?: unknown; name?: unknown }

function isRawListItem(value: unknown): value is RawListItem {
  return typeof value === 'object' && value !== null
}

export function filmarksAnimeTrend(html: string): RankedItem[] {
  const scripts = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? []

  for (const script of scripts) {
    const jsonText = script.replace(/^<script[^>]*>/, '').replace(/<\/script>$/, '')
    let data: unknown
    try {
      data = JSON.parse(jsonText)
    } catch {
      continue
    }

    const parsed = data as { '@type'?: unknown; itemListElement?: unknown }
    if (parsed?.['@type'] !== 'ItemList' || !Array.isArray(parsed.itemListElement)) continue

    const items: RankedItem[] = []
    for (const raw of parsed.itemListElement) {
      if (!isRawListItem(raw)) continue
      const { position, name } = raw
      if (typeof position !== 'number' || !Number.isInteger(position)) continue
      if (typeof name !== 'string' || name.trim() === '') continue
      items.push({ title: name.trim(), currentRank: position })
    }
    return items
  }

  return []
}
