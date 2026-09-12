// 記事データの組み立て(仕様: design.md「1回分の記事を生成する処理」手順5、
// requirements.md#実行-4、requirements.md#掲載件数の保証-2)。
// scripts/trend-digest/generate-content.tsが出力する「生成に成功した候補のみ」の配列
// (失敗した候補は呼び出し側のgenerateTopicsで既に除外済み)を受け取り、
// article-detail/design.mdのArticleスキーマに従う記事データを組み立てる純粋関数。
// ファイル入出力はscripts/trend-digest/write-article.ts(Task2)が担う

import type { Article, Edition, Genre, Topic } from './types'
import { GENRE_ORDER } from './types'

// generate-content.tsの出力(GeneratedTopicOutput)と同じ形。titleはCandidate.titleを
// 引き継いだもので、Topic.sourceTitleに変換される
export type GeneratedTopicInput = {
  genre: Genre
  title: string
  sourceName: string
  sourceUrl: string
  heading: string
  body: string
}

// edition・発行日・生成済みトピック(生成に成功した候補のみ)からArticleを組み立てる。
// topicsはGENRE_ORDER(ジャンル定義順)に並び替え、並び替え後の位置に応じて
// id(topic-1, topic-2, ...)を採番する
export function assembleArticle(edition: Edition, date: string, topics: GeneratedTopicInput[]): Article {
  const order = GENRE_ORDER[edition]
  const sorted = [...topics].sort((a, b) => order.indexOf(a.genre) - order.indexOf(b.genre))

  const sortedTopics: Topic[] = sorted.map((topic, index) => ({
    id: `topic-${index + 1}`,
    genre: topic.genre,
    heading: topic.heading,
    body: topic.body,
    sourceTitle: topic.title,
    sourceName: topic.sourceName,
    sourceUrl: topic.sourceUrl,
  }))

  return {
    id: `${date}-${edition}`,
    edition,
    date,
    topics: sortedTopics,
  }
}
