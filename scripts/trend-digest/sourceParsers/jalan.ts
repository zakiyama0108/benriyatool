// じゃらんnet人気ランキングの専用パーサー(仕様: design.md「サイトごとの専用パーサー」
// 「補足(じゃらんnet人気ランキングの限界)」)。旅行・観光ジャンルの情報源
// (watchlist.json「じゃらんnet人気ランキング」)。
//
// HTML構造(2026-09-27時点で実際に取得して確認): `jalan.net/news/`は「新着」「ランキング」の
// 2タブを持ち、「ランキング」タブ(`<div class="article_section" data-tab="rank">`)の
// `<ul class="list_article">`内に、掲載順(=人気順)で記事が並ぶ。各記事のタイトルは
// `<span class="text">タイトル</span>`。このページ自体に明示的な順位番号は無いため、
// 一覧内の掲載順を現在順位として採用する(design.md補足のとおり、これはjalanニュース内の
// 人気記事のランキングであり、観光スポットそのものの人気ランキングではない。取得した項目は
// 記事タイトルになる点に留意する)
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function jalan(html: string): RankedItem[] {
  const start = html.indexOf('article_section" data-tab="rank"')
  if (start === -1) return []
  const end = html.indexOf('</ul>', start)
  const block = end === -1 ? html.slice(start) : html.slice(start, end)

  const items: RankedItem[] = []
  let rank = 1
  for (const match of block.matchAll(/<span class="text">([^<]+)<\/span>/g)) {
    const title = match[1].trim()
    if (!title) continue
    items.push({ title, currentRank: rank })
    rank += 1
  }
  return items
}
