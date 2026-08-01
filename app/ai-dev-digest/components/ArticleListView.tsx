import type { Article } from '../lib/types'
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
      <p className="rounded-[35px] border border-lms-line-strong bg-lms-card p-6 text-sm text-lms-muted shadow-[0_1px_2px_rgba(16,64,56,0.04)]">
        まだ記事がありません。しばらくお待ちください。
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {articles.map((article) => (
          <ArticleCard
            key={article.date}
            date={article.date}
            topicHeadings={article.topics.slice(0, MAX_CARD_HEADINGS).map((t) => t.heading)}
            totalTopicCount={article.topics.length}
          />
        ))}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  )
}
