import type { Article } from './types'
import { SITE_URL } from '../../lib/site'

// 記事詳細ページのURLを導出する(仕様: requirements.md#配信内容-6、
// design.md「代表見出しを選ぶ処理」「配信メッセージを組み立てる処理」)。
// 配信本文に載せるURL(buildBroadcastMessage)と、記事ページ公開確認に使うURL
// (waitForPageAvailable)を同じ関数から導出することで、両者が食い違わないようにする
// (app/trend-digest/lib/articleUrl.tsと同じ実装パターン)
export function buildArticleUrl(article: Article): string {
  return `${SITE_URL}/future-digest/${article.id}`
}
