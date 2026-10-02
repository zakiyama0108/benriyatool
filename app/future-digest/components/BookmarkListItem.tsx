import Link from 'next/link'
import type { Genre, Horizon } from '../lib/types'
import SlotBadges from './SlotBadges'
import BookmarkPanel from './BookmarkPanel'

type Props = {
  articleId: string
  entry: { heading: string; genre: Genre; horizon: Horizon }
  bookmark: { id: string; predictionId: string; memo: string }
}

// 付箋一覧の1項目(仕様: requirements.md#付箋の一覧-10〜12、design.md「付箋一覧からの
// 編集・削除」)。見出し(対象予測へのリンク)・ジャンルと時間軸のバッジを表示し、配下に
// BookmarkPanelを表示することで、一覧画面だけで編集・削除が完結する(記事詳細ページに戻らない)。
// news-digestのBookmarkListItem.tsxと同じ実装パターン
export default function BookmarkListItem({ articleId, entry, bookmark }: Props) {
  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <SlotBadges genre={entry.genre} horizon={entry.horizon} />
      <Link
        href={`/future-digest/${articleId}#${bookmark.predictionId}`}
        className="mt-1 block text-sm font-bold text-indigo-700 hover:underline"
      >
        {entry.heading}
      </Link>
      <BookmarkPanel
        articleId={articleId}
        predictionId={bookmark.predictionId}
        initialBookmark={{ id: bookmark.id, memo: bookmark.memo }}
      />
    </li>
  )
}
