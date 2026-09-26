import type { Genre, Topic } from '../lib/types'
import { GENRE_LABELS } from '../lib/types'
import TopicCard from './TopicCard'

type Props = {
  genre: Genre
  topic: Topic | null
  isAdmin: boolean
  articleId: string
}

// 1ジャンル分の見出し+配下トピックカードの表示(仕様: requirements.md#記事本文表示-2〜3、
// requirements.md#継続度・注目度の表示-17、design.md「その回の記事本文を表示する処理」)。
// 各ジャンルから必ず1件を掲載する運用のため、見出しは常に表示する(topicがnullでも見出しだけを
// 消さない)。topicがnull(情報源から話題を取得できなかった、または過去記事でそのジャンルの
// 掲載がなかった)場合は、TopicCardの代わりに取得できなかった旨を表示する。呼び出し元
// (ArticleDetailView)がGENRE_ORDER[edition]の順に本コンポーネントを並べることで、全体として
// ジャンル定義順の表示になる。isAdmin・articleIdはTopicCard(→FeedbackForm)へそのまま受け渡すだけで、
// ここでは判定・DB読み取りを一切行わない(design.md「セキュリティ」)
export default function GenreSection({ genre, topic, isAdmin, articleId }: Props) {
  return (
    <section>
      <h2 className="text-lg font-bold text-amber-700">{GENRE_LABELS[genre]}</h2>
      <div className="mt-3">
        {topic ? (
          <TopicCard topic={topic} isAdmin={isAdmin} articleId={articleId} />
        ) : (
          <p className="rounded-2xl bg-white p-4 text-sm text-gray-400 shadow-sm sm:p-5">
            今回は情報源から話題を取得できませんでした
          </p>
        )}
      </div>
    </section>
  )
}
