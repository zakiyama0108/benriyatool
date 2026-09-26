import type { Article } from './types'
import { SITE_URL } from '../../lib/site'

// 記事詳細ページのURLを導出する(仕様: design.md「記事ページの公開を待つ処理」手順1)。
// 配信本文に載せるURL(buildBroadcastMessage)と、記事ページ公開確認に使うURL
// (waitForPageAvailable)を同じ関数から導出することで、両者が食い違わないようにする
export function buildArticleUrl(article: Article): string {
  return `${SITE_URL}/ai-dev-digest/${article.date}`
}
