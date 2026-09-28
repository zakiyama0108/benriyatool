import type { Metadata } from 'next'
import Link from 'next/link'
import { getAllArticles } from '../lib/articles'
import { buildPredictionIndex } from '../lib/predictionIndex'
import BookmarkListView from '../components/BookmarkListView'

// 付箋一覧ページ(仕様: design.md「画面設計」「セキュリティ」)。個人のメモを扱うページのため
// noindexにする(sitemapにも含めない。app/sitemap.ts参照)
export const metadata: Metadata = {
  title: '付箋一覧｜週刊未来予測',
  robots: { index: false, follow: false },
}

// getAllArticles()からpredictionIndexを組み立て、BookmarkListViewへpropsで渡す。
// page.tsx自体はNext.jsのルーティング用ファイルのためカバレッジ計測対象外(vitest.config.mtsの
// 既存除外設定)。新規テストは追加せず、predictionIndex.test.ts・BookmarkListView.test.tsxで担保する
export default function BookmarksPage() {
  const predictionIndex = buildPredictionIndex(getAllArticles())

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50/40 to-white">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <nav className="text-[11px] text-gray-400">
          <Link href="/" className="hover:underline">
            べんりやつーる
          </Link>
          <span className="mx-1">›</span>
          <Link href="/future-digest" className="hover:underline">
            週刊未来予測
          </Link>
          <span className="mx-1">›</span>
          <span>付箋一覧</span>
        </nav>

        <header>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">付箋一覧</h1>
        </header>

        <BookmarkListView predictionIndex={predictionIndex} />
      </div>
    </div>
  )
}
