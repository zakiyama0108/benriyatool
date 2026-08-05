import type { Article } from './types'
import { buildArticleTitle } from './articleTitle'

export type TopicIndexEntry = { articleTitle: string; topicHeading: string }

// 全記事から「記事日付:トピックID」→記事タイトル・トピック見出しの索引を作る
// (仕様: design.md「付箋一覧を取得して表示する処理」手順3)。付箋一覧ページで、保存された
// articleDate・topicIdから表示用の記事タイトル・トピック見出しを引き当てるために使う。
// 対応するトピックが見つからない場合(記事データの構成が将来変わった場合)はキー自体が
// 存在しないため、呼び出し元はundefinedを見てその項目を一覧から除外できる
export function buildTopicIndex(articles: Article[]): Record<string, TopicIndexEntry> {
  const index: Record<string, TopicIndexEntry> = {}
  for (const article of articles) {
    const articleTitle = buildArticleTitle(article.date)
    for (const topic of article.topics) {
      index[`${article.date}:${topic.id}`] = { articleTitle, topicHeading: topic.heading }
    }
  }
  return index
}
