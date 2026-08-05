import type { Article } from './types'

// 全記事から「記事日付:トピックID」→トピック見出しの索引を作る
// (仕様: design.md「付箋一覧を取得して表示する処理」手順3)。付箋一覧ページで、保存された
// articleDate・topicIdから表示用のトピック見出しを引き当てるために使う。
// 対応するトピックが見つからない場合(記事データの構成が将来変わった場合)はキー自体が
// 存在しないため、呼び出し元はundefinedを見てその項目を一覧から除外できる
export function buildTopicIndex(articles: Article[]): Record<string, string> {
  const index: Record<string, string> = {}
  for (const article of articles) {
    for (const topic of article.topics) {
      index[`${article.date}:${topic.id}`] = topic.heading
    }
  }
  return index
}
