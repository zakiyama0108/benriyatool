// 映画.com国内/全米ランキングの専用パーサー(仕様: design.md「サイトごとの専用パーサー」)。
// 日本映画(国内ランキング)・海外映画(全米ランキング)の補助情報源。国内/全米は同一テンプレートの
// ページのためパーサーを共用する(watchlist.json「映画.com国内ランキング」「映画.com全米ランキング」)。
//
// HTML構造(2026-09-27時点で実際に取得して確認): 1作品1行の`<tr>`。現在順位は
// `<th abbr="N位">`、前週順位は同じ行の`<span class="last-week stay|down|up">N</span>`
// (新規は`class="last-week new">初</span>`)。作品タイトルは`<h2 class="title"><a>`のリンク
// テキストではなく、ポスター画像の`alt`属性(`<img width="90" alt="タイトル">`)から取る
// (全米ランキングは原題と日本語タイトルが`<br/>`で連結されており、リンクテキストをそのまま
// 抽出すると`<br/>`をまたいだ2言語混在の文字列になる。alt属性は日本語タイトルのみを持つ)。
// トップ10のみの掲載(「先週」欄が数値以外の場合、前週順位は不明として扱い推測しない)
import type { RankedItem } from '../../../app/trend-digest/lib/fetchFixedListCandidates'

export function eigaCom(html: string): RankedItem[] {
  const items: RankedItem[] = []
  const rowPattern = /<th abbr="(\d+)位">[\s\S]*?<\/tr>/g

  for (const match of html.matchAll(rowPattern)) {
    const currentRank = Number(match[1])
    const row = match[0]
    const titleMatch = row.match(/<img width="90" alt="([^"]+)"/)
    if (!titleMatch) continue
    const title = titleMatch[1].trim()
    if (!title) continue

    const item: RankedItem = { title, currentRank }
    const lastWeekMatch = row.match(/class="last-week ([a-z]+)">([^<]*)<\/span>/)
    if (lastWeekMatch) {
      const [, kind, text] = lastWeekMatch
      if (kind === 'new') {
        item.isNew = true
      } else if (/^\d+$/.test(text.trim())) {
        item.previousRank = Number(text.trim())
      }
      // "up"クラスなのに前週順位が数値以外(サイト側のデータ欠落)の場合は不明として扱い推測しない
    }
    items.push(item)
  }

  return items
}
