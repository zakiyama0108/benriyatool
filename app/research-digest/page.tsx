import { getAllArticles } from './lib/articles'
import { paginate } from './lib/pagination'
import ArticleListView from './components/ArticleListView'
import ListLoginStatus from './components/ListLoginStatus'

// 記事一覧ページ(1ページ目)。仕様: article-list/requirements.md#一覧表示-1、article-list/design.md「関連するファイル」。
// TDD対象外(一覧の各ロジックはlib/pagination.ts・components/配下のテストで担保済み。tasks.md Task 6参照)。
//
// title/descriptionはNext.jsのmetadata exportの都合上、親のlayout.tsxで保持する
export default function ArticleListPage() {
  const { items, totalPages } = paginate(getAllArticles(), 1)

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-slate-50/40 to-white">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <header>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">週刊研究発見</h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            医療・栄養・心理・環境・AIなど10ジャンルから、日々の生活に影響の大きい研究の発見・論文を1本ずつ要約してお届け。からだ・くらし編は月曜、科学・社会編は土曜に公開。
          </p>
        </header>
        <ArticleListView articles={items} currentPage={1} totalPages={totalPages} />
        <ListLoginStatus />
      </div>
    </div>
  )
}
