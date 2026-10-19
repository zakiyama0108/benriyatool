import type { Genre, Topic } from '../lib/types'
import { GENRE_LABELS } from '../lib/types'
import TopicCard from './TopicCard'

type Props = {
  genre: Genre
  topics: Topic[] // このジャンルのトピック。新ルールの記事は最大1件、unavailableGenresを持たない過去の記事は複数件ありうる
  unavailable: boolean // 記事のunavailableGenresにこのジャンルが含まれるか
  isAdmin: boolean
  articleId: string
}

// 1ジャンル分の見出し+配下トピックカードの表示(仕様: requirements.md#記事本文表示-2〜3、
// requirements.md#継続度・注目度の表示-17、design.md「その回の記事本文を表示する処理」手順4)。
// - トピックがある: 見出し+TopicCard(過去の記事は複数件ありうるため全件を並べる)
// - トピックがなくunavailable(unavailableGenresに含まれる): 見出しと「取得できなかった旨」を表示
// - トピックがなくunavailableでもない(unavailableGenresを持たない過去の記事の掲載なしジャンル):
//   何も表示しない(セクション自体を出さない。公開済み記事を書き換えずに新ルールと両立させるため)
// 呼び出し元(ArticleDetailView)がGENRE_ORDER[edition]の順に本コンポーネントを並べることで、
// ジャンル定義順の表示になる。isAdmin・articleIdはTopicCard(→FeedbackForm)へそのまま受け渡すだけで、
// ここでは判定・DB読み取りを一切行わない(design.md「セキュリティ」)
export default function GenreSection({ genre, topics, unavailable, isAdmin, articleId }: Props) {
  if (topics.length === 0 && !unavailable) return null

  return (
    <section>
      <h2 className="text-lg font-bold text-amber-700">{GENRE_LABELS[genre]}</h2>
      <div className="mt-3 space-y-3">
        {topics.length > 0 ? (
          topics.map((topic) => <TopicCard key={topic.id} topic={topic} isAdmin={isAdmin} articleId={articleId} />)
        ) : (
          <p className="rounded-2xl bg-white p-4 text-sm text-gray-400 shadow-sm sm:p-5">
            今回は情報源から話題を取得できませんでした
          </p>
        )}
      </div>
    </section>
  )
}
