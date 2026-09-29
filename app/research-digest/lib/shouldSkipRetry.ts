import type { Article } from './types'

// 再実行cronの冪等チェック(仕様: weekly-publish/requirements.md#利用上限への到達時の再実行-2、
// weekly-publish/design.md「利用上限への到達時に再実行する処理」手順1)。
// 指定した配信日の記事が既に存在するかどうかだけを判定する純粋関数。存在すれば公開済みのため
// 何もせず成功として終える(打ち切りの理由が利用上限かどうかは問わない)
export function shouldSkipRetry(articles: Article[], scheduledPublishDate: string): boolean {
  return articles.some((article) => article.date === scheduledPublishDate)
}
