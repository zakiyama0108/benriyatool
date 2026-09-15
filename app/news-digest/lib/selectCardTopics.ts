import type { Category, Topic } from './types'

export type CardTopic = {
  heading: string
  category: Category
  whatHappenedTeaser: string
}

const MAX_CARD_TOPICS = 3

// カードに表示するトピック見出し・導入文を選ぶ処理(仕様: requirements.md#一覧表示-2・4〜5、
// requirements.md#ビジネスルール・制約-1、design.md「カードに表示するトピック見出し・導入文を
// 選ぶ処理」)。一覧専用の別要約は作らず、詳細ページと同じheading・summary.whatHappened.teaserを
// 先頭から最大3件だけ抜き出す
export function selectCardTopics(topics: Topic[], max = MAX_CARD_TOPICS): CardTopic[] {
  return topics.slice(0, max).map((topic) => ({
    heading: topic.heading,
    category: topic.category,
    whatHappenedTeaser: topic.summary.whatHappened.teaser,
  }))
}
