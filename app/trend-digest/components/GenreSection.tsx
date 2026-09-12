import type { Genre, Topic } from '../lib/types'
import { GENRE_LABELS } from '../lib/types'
import TopicCard from './TopicCard'

type Props = {
  genre: Genre
  topics: Topic[]
  isAdmin: boolean
  articleId: string
}

// 1ジャンル分の見出し+配下トピックカードの表示(仕様: requirements.md#記事本文表示-2〜3、
// design.md「その回の記事本文を表示する処理」)。動きがなかったジャンル(topicsが0件)は
// 見出し自体を表示しない(requirements.md#記事本文表示-2)。呼び出し元(ArticleDetailView)が
// GENRE_ORDER[edition]の順に本コンポーネントを並べることで、全体としてジャンル定義順の
// 表示になる(content-selectionの検証により同一ジャンルのtopicsは既に最大2件のため、
// ここでは追加の絞り込みを行わない)。isAdmin・articleIdはTopicCard(→FeedbackForm)へ
// そのまま受け渡すだけで、ここでは判定・DB読み取りを一切行わない(design.md「セキュリティ」)
export default function GenreSection({ genre, topics, isAdmin, articleId }: Props) {
  if (topics.length === 0) return null

  return (
    <section>
      <h2 className="text-lg font-bold text-amber-700">{GENRE_LABELS[genre]}</h2>
      <div className="mt-3 space-y-4">
        {topics.map((topic) => (
          <TopicCard key={topic.id} topic={topic} isAdmin={isAdmin} articleId={articleId} />
        ))}
      </div>
    </section>
  )
}
