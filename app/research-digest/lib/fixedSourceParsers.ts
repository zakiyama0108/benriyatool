// site-specific-html向けの専用パーサー(仕様: content-selection/design.md「固定情報源のHTML構造への
// 対応」(決定事項)、design.md「固定情報源からヒントを集める処理」)。調査した6件のHTML公開ページの
// 構造がいずれも異なるため(日付の持ち方・テキスト表記がそれぞれ違う)、1つの汎用パーサーで無理に
// 対応せず、情報源ごとに専用のパース関数を持つ(trend-digest・future-digestの`parserId`方式と同じ
// 考え方)。各関数は`fetchFixedSourceHints.ts`のHtmlParsers辞書に`parserId`で登録して使う
import type { RawFixedSourceItem } from './fetchFixedSourceHints'

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim()
}

// ブロック内の最初の<a href="...">...</a>を抜き出す(href属性と、閉じタグまでの生の内部HTML)
function extractAnchor(text: string): { href: string; innerHtml: string } | null {
  const m = text.match(/<a[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
  return m ? { href: m[1], innerHtml: m[2] } : null
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}

// <time datetime="YYYY-MM-DD">形式のISO日付を抜き出す(NAO・NEDOが使う)
function extractIsoDate(text: string): string | null {
  return text.match(/datetime="(\d{4}-\d{2}-\d{2})/)?.[1] ?? null
}

// YYYY/MM/DD形式の日付を抜き出す(日本栄養士会・産総研が使う。前後に任意の文字が付いてもよい)
function extractSlashDate(text: string): string | null {
  const m = text.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null
}

// 「令和8年（2026年）9月30日」のように和暦と西暦が混在する表記から、埋め込まれた西暦年を使って
// 日付を抜き出す(日本医師会が使う。年と月の間に"）"等が挟まることを許容する)
function extractKanjiDateWithEmbeddedYear(text: string): string | null {
  const m = text.match(/(\d{4})年\D{0,2}(\d{1,2})月(\d{1,2})日/)
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null
}

// 令和は2019-05-01開始(令和1年=2019年)のため、令和N年の西暦はN+2018年(文部科学省が使う。
// 改元時はこの定数の見直しが必要)
const REIWA_ERA_OFFSET = 2018

function extractReiwaDate(text: string): string | null {
  const m = text.match(/令和(\d{1,2})年(\d{1,2})月(\d{1,2})日/)
  if (!m) return null
  const year = Number(m[1]) + REIWA_ERA_OFFSET
  return `${year}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
}

// 日本医師会プレスリリース一覧(https://www.med.or.jp/nichiionline/press/)
export function jmaPress(html: string): RawFixedSourceItem[] {
  const items: RawFixedSourceItem[] = []
  for (const block of html.split('class="newsInner"').slice(1)) {
    const publishedAt = extractKanjiDateWithEmbeddedYear(block)
    const anchor = extractAnchor(block)
    const url = anchor && resolveUrl(anchor.href, 'https://www.med.or.jp')
    if (publishedAt && anchor && url) items.push({ title: stripTags(anchor.innerHtml), url, publishedAt })
  }
  return items
}

// 日本栄養士会お知らせ(https://www.dietitian.or.jp/news/)
export function dietitianNews(html: string): RawFixedSourceItem[] {
  const items: RawFixedSourceItem[] = []
  for (const block of html.split('lyt-news_link--item').slice(1)) {
    const publishedAt = extractSlashDate(block)
    const anchor = extractAnchor(block)
    const url = anchor && resolveUrl(anchor.href, 'https://www.dietitian.or.jp')
    if (publishedAt && anchor && url) items.push({ title: stripTags(anchor.innerHtml), url, publishedAt })
  }
  return items
}

// 産業技術総合研究所(産総研)研究成果記事一覧(https://www.aist.go.jp/aist_j/list/l_research_research.html)
export function aistResearch(html: string): RawFixedSourceItem[] {
  const items: RawFixedSourceItem[] = []
  for (const block of html.split('class="reportList"').slice(1)) {
    const publishedAt = extractSlashDate(block)
    const anchor = extractAnchor(block)
    const url = anchor && resolveUrl(anchor.href, 'https://www.aist.go.jp')
    if (publishedAt && anchor && url) items.push({ title: stripTags(anchor.innerHtml), url, publishedAt })
  }
  return items
}

// 国立天文台トピックス・研究成果(https://www.nao.ac.jp/news/)。カード全体が1つの<a>で
// 囲まれているため、見出しはアンカーの内部HTMLからさらに<h2>を抜き出す
export function naoNews(html: string): RawFixedSourceItem[] {
  const items: RawFixedSourceItem[] = []
  for (const block of html.split('class="l-column2-3__item"').slice(1)) {
    const publishedAt = extractIsoDate(block)
    const anchor = extractAnchor(block)
    const titleMatch = anchor?.innerHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)
    const url = anchor && resolveUrl(anchor.href, 'https://www.nao.ac.jp')
    if (publishedAt && anchor && titleMatch && url) items.push({ title: stripTags(titleMatch[1]), url, publishedAt })
  }
  return items
}

// NEDOニュースリリース一覧(https://www.nedo.go.jp/news/)。<time datetime="...">の直後に
// タイトルの<a>が続く構造のため、同じマーカーで区切ったブロックの先頭がそのまま日付になる
export function nedoNews(html: string): RawFixedSourceItem[] {
  const items: RawFixedSourceItem[] = []
  for (const block of html.split('<time datetime="').slice(1)) {
    const publishedAt = block.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? null
    const anchor = extractAnchor(block)
    const url = anchor && resolveUrl(anchor.href, 'https://www.nedo.go.jp')
    if (publishedAt && anchor && url) items.push({ title: stripTags(anchor.innerHtml), url, publishedAt })
  }
  return items
}

// 文部科学省報道発表(https://www.mext.go.jp/b_menu/houdou/)。1つの日付見出し(h3)の下に
// 複数件が並ぶことがあるが、ヒントは手がかりに過ぎないため先頭1件のみを抜き出す(design.md
// 「固定情報源からヒントを集める処理」手順1。残りはWebSearchで補う)
export function mextHoudou(html: string): RawFixedSourceItem[] {
  const items: RawFixedSourceItem[] = []
  for (const block of html.split('class="information-date"').slice(1)) {
    const publishedAt = extractReiwaDate(block)
    const anchor = extractAnchor(block)
    const url = anchor && resolveUrl(anchor.href, 'https://www.mext.go.jp')
    if (publishedAt && anchor && url) items.push({ title: stripTags(anchor.innerHtml), url, publishedAt })
  }
  return items
}
