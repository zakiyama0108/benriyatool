import Link from 'next/link'
import { getAllArticles } from '../lib/articles'
import { buildTopicIndex } from '../lib/topicIndex'
import BookmarkListView from '../components/BookmarkListView'

// 付箋一覧ページ(仕様: requirements.md#付箋した記事一覧-10、design.md「関連するファイル」
// 「画面設計」)。getAllArticles()からトピック索引を組み立て、BookmarkListViewへpropsで渡す。
// page.tsx自体はNext.jsのルーティング用ファイルのためカバレッジ計測対象外(vitest.config.mtsの
// 既存除外設定)。新規テストは追加せず、topicIndex.test.ts・BookmarkListView.test.tsxで担保する
export default function BookmarksPage() {
  const topicIndex = buildTopicIndex(getAllArticles())

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50/40 to-white">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <nav className="text-[11px] text-gray-400">
          <Link href="/" className="hover:underline">
            べんりやつーる
          </Link>
          <span className="mx-1">›</span>
          <Link href="/ai-dev-digest" className="hover:underline">
            AI駆動開発ダイジェスト
          </Link>
          <span className="mx-1">›</span>
          <span>付箋一覧</span>
        </nav>

        <header>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">付箋一覧</h1>
        </header>

        <BookmarkListView topicIndex={topicIndex} />
      </div>
    </div>
  )
}
