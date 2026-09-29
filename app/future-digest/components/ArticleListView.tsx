import type { Article } from '../lib/types'
import { selectCardHeadings } from '../lib/selectCardHeadings'
import ArticleCard from './ArticleCard'
import Pagination from './Pagination'

type Props = {
  articles: Article[]
  currentPage: number
  totalPages: number
}

// 記事一覧部分の表示(仕様: requirements.md#一覧表示-1〜3・5、design.md「画面設計」)。
// 記事が1件もない場合は案内文のみを表示する(requirements.md#一覧表示-5)
export default function ArticleListView({ articles, currentPage, totalPages }: Props) {
  if (articles.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-4 text-sm leading-relaxed text-gray-500 shadow-sm">
        まだ記事がありません。最初の号は木曜の朝に公開されます。
      </p>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} headings={selectCardHeadings(article)} />
        ))}
      </div>
      <Pagination currentPage={currentPage} totalPages={totalPages} />
    </div>
  )
}
