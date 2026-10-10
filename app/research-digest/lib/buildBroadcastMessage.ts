import type { Article, Edition } from './types'
import { EDITION_LABELS, GENRE_LABELS, IMPACT_LABELS } from './types'
import { sortGenres } from './sortGenres'
import { buildArticleUrl } from './articleUrl'

// LINE配信メッセージ専用の見出し(仕様: line-broadcast/requirements.md#配信内容-2、
// line-broadcast/design.md「配信メッセージを組み立てる処理」手順1)
export function buildBroadcastTitle(date: string, edition: Edition): string {
  const [year, month, day] = date.split('-').map((part) => Number(part))
  return `【週刊研究発見】${EDITION_LABELS[edition]} ${year}年${month}月${day}日号`
}

// LINEブロードキャストメッセージの本文を組み立てる(仕様: line-broadcast/requirements.md#配信内容-1〜6、
// line-broadcast/design.md「配信メッセージを組み立てる処理」)。配信専用タイトル・掲載した研究の
// 見出し一覧(影響度・ジャンル名付き、影響度順→ジャンル順)・記事詳細ページリンクで構成し、
// 研究ごとの出典URL(sourceUrl)は含めない。並び順は記事詳細ページの影響度順(sortGenres)と
// 同じ規則を使い、掲載できなかったジャンルは一覧に載せない。研究が0件(採用0件の回)は
// 見出しの行の代わりに固定文言を入れる
export function buildBroadcastMessage(article: Article): string {
  const lines = [buildBroadcastTitle(article.date, article.edition), '']

  const findings = sortGenres(article, 'impact').flatMap((entry) => (entry.kind === 'finding' ? [entry.finding] : []))
  if (findings.length === 0) {
    lines.push('今週は掲載できる記事がありませんでした', '')
  } else {
    const headings = findings
      .map((f) => `・【影響度 ${IMPACT_LABELS[f.impact]}/${GENRE_LABELS[f.genre] ?? f.genre}】${f.heading}`)
      .join('\n')
    lines.push(headings, '')
  }

  lines.push('記事を読む', buildArticleUrl(article))

  return lines.join('\n')
}
