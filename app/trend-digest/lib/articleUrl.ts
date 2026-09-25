import type { Article } from './types'
import { SITE_URL } from '../../lib/site'

// 記事詳細ページのURLを導出する(仕様: design.md「記事ページの公開を待つ処理」手順1)。
// 配信本文に載せるURL(buildBroadcastMessage)と、記事ページ公開確認に使うURL
// (waitForPageAvailable)を同じ関数から導出することで、両者が食い違わないようにする。
// trend-digestはdate(週次記事はエンタメ編・カルチャー編が同日に複数存在しうる)ではなく
// id(ファイル名と一致し記事内で一意)でURLを組み立てる
export function buildArticleUrl(article: Article): string {
  return `${SITE_URL}/trend-digest/${article.id}`
}
