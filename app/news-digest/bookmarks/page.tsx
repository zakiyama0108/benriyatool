import { getAllArticles } from '../lib/articles'
import { buildTopicIndex } from '../lib/topicIndex'
import BookmarkListView from '../components/BookmarkListView'
import Breadcrumb from '../components/Breadcrumb'

// 付箋一覧ページ(仕様: requirements.md#付箋した記事一覧-10、design.md「関連するファイル」
// 「画面設計」)。getAllArticles()からトピック索引を組み立て、BookmarkListViewへpropsで渡す。
// page.tsx自体はNext.jsのルーティング用ファイルのためカバレッジ計測対象外(vitest.config.mtsの
// 既存除外設定)。新規テストは追加せず、topicIndex.test.ts・BookmarkListView.test.tsxで担保する
export default function BookmarksPage() {
  const topicIndex = buildTopicIndex(getAllArticles())

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-teal-50/40 to-white">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <Breadcrumb current="付箋一覧" />

        <header>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">付箋一覧</h1>
        </header>

        <BookmarkListView topicIndex={topicIndex} />
      </div>
    </div>
  )
}
