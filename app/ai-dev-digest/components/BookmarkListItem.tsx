import Link from 'next/link'
import BookmarkPanel from './BookmarkPanel'

type Props = {
  articleDate: string
  topicHeading: string
  bookmark: { id: string; topicId: string; memo: string }
}

// 付箋一覧の1項目(仕様: requirements.md#付箋した記事一覧-11〜13、design.md「付箋一覧からの
// 編集・削除」)。トピック見出し(対象トピックへのリンク)を表示し、配下に
// BookmarkPanelを表示することで、一覧画面だけで編集・削除が完結する(記事詳細ページに戻らない)
export default function BookmarkListItem({ articleDate, topicHeading, bookmark }: Props) {
  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <Link href={`/ai-dev-digest/${articleDate}#${bookmark.topicId}`} className="text-sm font-bold text-teal-700 hover:underline">
        {topicHeading}
      </Link>
      <BookmarkPanel
        articleDate={articleDate}
        topicId={bookmark.topicId}
        initialBookmark={{ id: bookmark.id, memo: bookmark.memo }}
      />
    </li>
  )
}
