import { notFound } from 'next/navigation'
import { getAllArticles } from '../../lib/articles'
import { paginate } from '../../lib/pagination'
import ArticleListView from '../../components/ArticleListView'

// 記事一覧ページ(2ページ目以降)。仕様: requirements.md#ビジネスルール・制約-2、
// design.md「関連するファイル」。TDD対象外(tasks.md Task5参照。ロジック自体はlib/pagination.tsで担保済み)。
//
// [date]/page.tsxと同じ理由(nextjs-notes.md参照)で、2ページ目が存在しない(記事が20件以下)
// 場合にgenerateStaticParams()が空配列を返すとoutput: 'export'のビルドが失敗するため、
// プレースホルダーpathを返しページ側でnotFound()に倒す
export function generateStaticParams() {
  const { totalPages } = paginate(getAllArticles(), 1)
  const pages = Array.from({ length: Math.max(0, totalPages - 1) }, (_, i) => ({ page: String(i + 2) }))
  return pages.length > 0 ? pages : [{ page: '__no-second-page-yet__' }]
}

export default async function ArticleListPageN({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params
  const pageNumber = Number(page)
  if (!Number.isInteger(pageNumber) || pageNumber < 2) notFound()

  const { items, totalPages } = paginate(getAllArticles(), pageNumber)
  if (pageNumber > totalPages) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50/40 to-white">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <header>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">AI駆動開発ダイジェスト</h1>
        </header>
        <ArticleListView articles={items} currentPage={pageNumber} totalPages={totalPages} />
      </div>
    </div>
  )
}
