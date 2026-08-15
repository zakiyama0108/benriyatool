import type { Article } from '../lib/types'
import { isLegacyTopic } from '../lib/types'
import ArticleCard from './ArticleCard'
import Pagination from './Pagination'

type Props = {
  articles: Article[]
  currentPage: number
  totalPages: number
}

const MAX_CARD_HEADINGS = 3

// 記事一覧部分の表示(仕様: requirements.md#一覧表示-1〜3、design.md「画面設計」)。
// 記事が1件もない場合は案内文のみを表示する(requirements.md#一覧表示-3)
export default function ArticleListView({ articles, currentPage, totalPages }: Props) {
  if (articles.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm leading-relaxed text-gray-500 shadow-sm">
        まだ記事がありません。しばらくお待ちください。
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {articles.map((article) => (
          <ArticleCard
            key={article.date}
            date={article.date}
            topics={article.topics.slice(0, MAX_CARD_HEADINGS).map((t) => ({
              heading: t.heading,
              benefitTeaser: isLegacyTopic(t) ? undefined : t.summary.benefit.teaser,
            }))}
            totalTopicCount={article.topics.length}
          />
        ))}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  )
}
