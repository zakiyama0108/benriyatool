// site-specific-html向けの専用パーサー(仕様: content-selection/design.md「固定情報源からヒントを集める処理」)。
// 7情報源のHTML構造がいずれも異なるため(テーブル・<li>・<details>グループ化・埋め込みJSON等)、
// 1つの汎用パーサーで無理に対応せず、parserIdごとに専用の抽出処理を持つ(trend-digestのparserId方式と同じ考え方)。
// ここで返す値はClaudeへの収集ヒントであり、採否判定の材料にはしないため、日付は元の表記のまま
// (元号・英語表記等)文字列として保持し、西暦変換等は行わない

export type RawHint = { title: string; url: string; publishedAt: string | null }

function resolveLink(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString()
  } catch {
    return null
  }
}

// AMED(日本医療研究開発機構) news/index.html: <li><div class="head">...<span class="date">日付</span></div><a href>見出し</a></li>
export function amedNews(html: string, baseUrl: string): RawHint[] {
  const items = html.match(/<li>\s*<div class="head">[\s\S]*?<\/li>/g) ?? []
  const results: RawHint[] = []
  for (const item of items) {
    const date = item.match(/<span class="date">([^<]+)<\/span>/)?.[1]?.trim() ?? null
    const anchor = item.match(/<a href="([^"]+)">([^<]+)<\/a>/)
    if (!anchor) continue
    const url = resolveLink(anchor[1], baseUrl)
    if (!url) continue
    results.push({ title: anchor[2].trim(), url, publishedAt: date })
  }
  return results
}

// IPCCホームページ: <h4><a href>見出し</a></h4> ... <h6>日付</h6>
export function ipccHome(html: string, baseUrl: string): RawHint[] {
  const re = /<h4><a href="([^"]+)">([^<]+)<\/a><\/h4>[\s\S]{0,400}?<h6>([^<]+)<\/h6>/g
  const results: RawHint[] = []
  for (const m of html.matchAll(re)) {
    const url = resolveLink(m[1], baseUrl)
    if (!url) continue
    results.push({ title: m[2].trim(), url, publishedAt: m[3].trim() })
  }
  return results
}

// 環境省報道発表: <summary>...<span class="p-press-release-list__heading">日付</span>...</summary>
// <div class="p-press-release-list__body">...<a class="c-news-link__link" href>見出し</a>...</div>
export function envPress(html: string, baseUrl: string): RawHint[] {
  const blockRe = /<span class="p-press-release-list__heading">([^<]+)<\/span>[\s\S]*?<div class="p-press-release-list__body">([\s\S]*?)<div class="p-press-release-list__anchor-back">/g
  const linkRe = /<a href="([^"]+)" class="c-news-link__link">([^<]+)<\/a>/g
  const results: RawHint[] = []
  for (const block of html.matchAll(blockRe)) {
    const date = block[1].trim()
    const body = block[2]
    for (const link of body.matchAll(linkRe)) {
      const url = resolveLink(link[1], baseUrl)
      if (!url) continue
      results.push({ title: link[2].trim(), url, publishedAt: date })
    }
  }
  return results
}

// リクルートワークス研究所 news/index.html: <a href><p class="itemNews__date">日付</p><p class="itemNews__text">見出し</p></a>
export function worksINews(html: string, baseUrl: string): RawHint[] {
  const re = /<a href="([^"]+)">\s*<p class="itemNews__date">([^<]+)<\/p>\s*<p class="itemNews__text">([^<]+)<\/p>\s*<\/a>/g
  const results: RawHint[] = []
  for (const m of html.matchAll(re)) {
    const url = resolveLink(m[1], baseUrl)
    if (!url) continue
    results.push({ title: m[3].trim(), url, publishedAt: m[2].trim() })
  }
  return results
}

// 国立長寿医療研究センター topics: <td class="dateCell">日付</td><td><a href>見出し</a>
export function ncggTopics(html: string, baseUrl: string): RawHint[] {
  const re = /<td class="dateCell">([^<]+)<\/td>\s*<td><a href="([^"]+)">([^<]+)<\/a>/g
  const results: RawHint[] = []
  for (const m of html.matchAll(re)) {
    const url = resolveLink(m[2], baseUrl)
    if (!url) continue
    results.push({ title: m[3].trim(), url, publishedAt: m[1].trim() })
  }
  return results
}

// IISS /latest/: ReactコンポーネントのpropsとしてページにインラインJSONが埋め込まれている
// ("Heading":"...","Date":"...","Link":"..."の並び)。HTMLタグではなくJSON文字列として抽出する
export function iissLatest(html: string, baseUrl: string): RawHint[] {
  const results: RawHint[] = []
  const dateRe = /"Date":"([^"]+)"/g
  for (const dateMatch of html.matchAll(dateRe)) {
    const idx = dateMatch.index ?? 0
    const before = html.slice(Math.max(0, idx - 2000), idx)
    const headingMatches = [...before.matchAll(/"Heading":"([^"]+)"/g)]
    const heading = headingMatches.at(-1)?.[1]
    if (!heading) continue
    const after = html.slice(idx, idx + 2000)
    const link = after.match(/"Link":"([^"]+)"/)?.[1]
    if (!link) continue
    const url = resolveLink(link, baseUrl)
    if (!url) continue
    results.push({ title: heading, url, publishedAt: dateMatch[1].trim() })
  }
  return results
}

// CFR /latest: <article>...<h3><a href="/articles/...">見出し</a></h3>...<time dateTime="...">表示用の日付</time>
export function cfrLatest(html: string, baseUrl: string): RawHint[] {
  const re = /<a[^>]*href="(\/articles\/[^"]+)"[^>]*>([^<]+)<\/a><\/h3>[\s\S]{0,400}?<time[^>]*dateTime="[^"]*"[^>]*>([^<]+)<\/time>/g
  const results: RawHint[] = []
  for (const m of html.matchAll(re)) {
    const url = resolveLink(m[1], baseUrl)
    if (!url) continue
    results.push({ title: m[2].trim(), url, publishedAt: m[3].trim() })
  }
  return results
}

export const SITE_SPECIFIC_PARSERS: Record<string, (html: string, baseUrl: string) => RawHint[]> = {
  amedNews,
  ipccHome,
  envPress,
  worksINews,
  ncggTopics,
  iissLatest,
  cfrLatest,
}
