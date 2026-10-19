import type { Article } from './types'

// 配信済みURLの正規化と配信済みの一覧の組み立て(仕様: content-selection/requirements.md#配信済みの記事・予測の除外-1〜2、
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

export type DeliveredIndex = {
  urls: Set<string> // 過去に掲載した全予測の正規化URLの集合(requirements.md#配信済みの記事・予測の除外-1)
  lines: string[] // ジャンル・時間軸・見出し・元記事タイトルを1行ずつにした一覧(実質的な重複をClaudeに判定させる材料。requirements.md#配信済みの記事・予測の除外-2)
}

// 公開済みの全記事データから配信済みの一覧を作る(design.md「配信済みの一覧を作る処理」)
export function buildDeliveredIndex(articles: Article[]): DeliveredIndex {
  const urls = new Set<string>()
  const lines: string[] = []

  for (const article of articles) {
    for (const prediction of article.predictions) {
      urls.add(normalizeUrl(prediction.sourceUrl))
      lines.push(`${prediction.genre}\t${prediction.horizon}\t${prediction.heading}\t${prediction.sourceTitle}`)
    }
  }

  return { urls, lines }
}
