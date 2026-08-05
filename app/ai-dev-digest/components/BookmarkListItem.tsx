import Link from 'next/link'
import BookmarkPanel from './BookmarkPanel'

type Props = {
  articleTitle: string
  articleDate: string
  topicHeading: string
  bookmark: { id: string; topicId: string; memo: string }
}

// 付箋一覧の1項目(仕様: requirements.md#付箋した記事一覧-11〜13、design.md「付箋一覧からの
// 編集・削除」)。記事タイトル・トピック見出し・対象トピックへのリンクを表示し、配下に
// BookmarkPanelを表示することで、一覧画面だけで編集・削除が完結する(記事詳細ページに戻らない)
export default function BookmarkListItem({ articleTitle, articleDate, topicHeading, bookmark }: Props) {
  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <Link href={`/ai-dev-digest/${articleDate}#${bookmark.topicId}`} className="text-sm font-bold text-teal-700 hover:underline">
        {articleTitle}
      </Link>
      <p className="mt-0.5 text-xs text-gray-500">{topicHeading}</p>
      <BookmarkPanel
        articleDate={articleDate}
        topicId={bookmark.topicId}
        initialBookmark={{ id: bookmark.id, memo: bookmark.memo }}
      />
    </li>
  )
}
