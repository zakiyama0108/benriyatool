import type { Article } from './types'

// 配信済みURL・DOIの正規化と配信済みの一覧の組み立て(仕様: content-selection/requirements.md#配信済みの研究の除外-1、
// content-selection/design.md「配信済みの一覧を作る処理」)

// スキーム・ホスト名を小文字にし、末尾のスラッシュ・#以降・utm_で始まる計測用クエリを除いた
// 比較用の正規化URLを返す(design.md「配信済みの一覧を作る処理」手順1)
export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl)
  const protocol = url.protocol.toLowerCase()
  const host = url.hostname.toLowerCase()
  const port = url.port ? `:${url.port}` : ''
  let pathname = url.pathname
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1)
  }

  const params = new URLSearchParams(url.search)
  for (const key of [...params.keys()]) {
    if (key.startsWith('utm_')) params.delete(key)
  }
  const query = params.toString()

  return `${protocol}//${host}${port}${pathname}${query ? `?${query}` : ''}`
}

// DOIを小文字にし、先頭の`https://doi.org/`・`doi:`を除いた比較用の形にする(design.md手順2)。
// DOIは大文字小文字を区別しない仕様のため小文字に揃えて突合する
export function normalizeDoi(rawDoi: string): string {
  return rawDoi
    .trim()
    .toLowerCase()
    .replace(/^https:\/\/doi\.org\//, '')
    .replace(/^doi:\s*/, '')
}

export type DeliveredIndex = {
  urls: Set<string> // 過去に掲載した全研究の正規化URLの集合
  dois: Set<string> // 過去に掲載した全研究の正規化DOIの集合(DOIがある研究のみ)
  lines: string[] // ジャンル・見出し・論文名を1行ずつにした一覧(実質的な重複をClaudeに判定させる材料)
}

// 公開済みの全記事データから配信済みの一覧を作る(design.md「配信済みの一覧を作る処理」)
export function buildDeliveredIndex(articles: Article[]): DeliveredIndex {
  const urls = new Set<string>()
  const dois = new Set<string>()
  const lines: string[] = []

  for (const article of articles) {
    for (const finding of article.findings) {
      urls.add(normalizeUrl(finding.sourceUrl))
      if (finding.doi) dois.add(normalizeDoi(finding.doi))
      lines.push(`${finding.genre}\t${finding.heading}\t${finding.sourceTitle}`)
    }
  }

  return { urls, dois, lines }
}
