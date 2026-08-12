import type { Metadata } from 'next'
import { getAllArticles } from './lib/articles'
import { paginate } from './lib/pagination'
import ArticleListView from './components/ArticleListView'

// 仕様: requirements.md#メタ情報-1
const TITLE = 'AI駆動開発ダイジェスト｜話題を毎日自動収集・要約'
const DESCRIPTION =
  'AI駆動開発(Claude Code・Cursorなど)に関する話題を毎日自動収集し、日本語でわかりやすく要約してお届け。忙しい方でも要点だけ素早くキャッチアップできます。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/ai-dev-digest',
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
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">AI駆動開発ダイジェスト</h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            AI駆動開発関連の話題を1日1回まとめてお届けします。
          </p>
        </header>
        <ArticleListView articles={items} currentPage={1} totalPages={totalPages} />
      </div>
    </div>
  )
}
