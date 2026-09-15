import type { Metadata } from 'next'
import { getAllArticles } from './lib/articles'
import { paginate } from './lib/pagination'
import ArticleListView from './components/ArticleListView'

// 仕様: requirements.md#メタ情報-1
const TITLE = '重要ニュースダイジェスト｜総合・経済・神奈川・育児を毎週自動収集'
const DESCRIPTION =
  '総合・経済/ビジネス・神奈川ローカル・育児関連の重要ニュースを週1回自動収集し、日本語でわかりやすく要約してお届け。複数の主要メディアが報じた信頼性の高いニュースだけを厳選します。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/news-digest',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

// 記事一覧ページ(1ページ目)。仕様: requirements.md#一覧表示-1、design.md「関連するファイル」。
// TDD対象外(一覧の各ロジックはlib/pagination.ts・components/配下のテストで担保済み。tasks.md Task5参照)
export default function ArticleListPage() {
  const { items, totalPages } = paginate(getAllArticles(), 1)

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50/40 to-white">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <header>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">重要ニュースダイジェスト</h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            総合・経済/ビジネス・神奈川ローカル・育児の重要ニュースを週1回まとめてお届けします。
          </p>
        </header>
        <ArticleListView articles={items} currentPage={1} totalPages={totalPages} />
      </div>
    </div>
  )
}
