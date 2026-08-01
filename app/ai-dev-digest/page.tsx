import { getAllArticles } from './lib/articles'
import { paginate } from './lib/pagination'
import ArticleListView from './components/ArticleListView'

// 記事一覧ページ(1ページ目)。仕様: requirements.md#一覧表示-1、design.md「関連するファイル」。
// TDD対象外(一覧の各ロジックはlib/pagination.ts・components/配下のテストで担保済み。tasks.md Task5参照)
export default function ArticleListPage() {
  const { items, totalPages } = paginate(getAllArticles(), 1)

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">AI駆動開発ダイジェスト</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI駆動開発関連の話題を1日1回まとめてお届けします。
        </p>
      </header>
      <ArticleListView articles={items} currentPage={1} totalPages={totalPages} />
    </div>
  )
}
