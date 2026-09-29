import { getAllArticles } from './lib/articles'
import { paginate } from './lib/pagination'
import ArticleListView from './components/ArticleListView'

// 記事一覧ページ(1ページ目)。仕様: requirements.md#一覧表示-1、design.md「関連するファイル」。
// TDD対象外(一覧の各ロジックはlib/pagination.ts・components/配下のテストで担保済み。tasks.md Task6参照)。
//
// title/descriptionはNext.jsのmetadata exportの都合上、親のlayout.tsxで保持する
export default function ArticleListPage() {
  const { items, totalPages } = paginate(getAllArticles(), 1)

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50/40 to-white">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <header>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">週刊未来予測</h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            テクノロジー・医療・環境・経済・宇宙など10ジャンルについて、近未来から50年後以降までの未来予測記事を毎週木曜に要約してお届け。
          </p>
        </header>
        <ArticleListView articles={items} currentPage={1} totalPages={totalPages} />
      </div>
    </div>
  )
}
