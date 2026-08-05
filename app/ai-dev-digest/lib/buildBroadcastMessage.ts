import type { Article } from './types'
import { buildArticleTitle } from './articleTitle'

// LINEブロードキャストメッセージの本文を組み立てる(仕様: design.md「配信メッセージ本文を組み立てる処理」)。
// 記事タイトル・トピック見出し一覧(掲載順・全件)・記事詳細ページリンクの3要素のみで構成し、
// トピックごとの出典URL(sourceUrl)は含めない(requirements.md#配信内容-1、4)
export function buildBroadcastMessage(article: Article): string {
  const title = buildArticleTitle(article.date)
  const headings = article.topics.map((topic) => `・${topic.heading}`).join('\n')
  const url = `https://benriyatool.com/ai-dev-digest/${article.date}`

  return [title, '', headings, '', '記事を読む', url].join('\n')
}
