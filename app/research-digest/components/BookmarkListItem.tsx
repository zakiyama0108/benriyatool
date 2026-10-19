import Link from 'next/link'
import type { Genre } from '../lib/types'
import FindingBadges from './FindingBadges'
import BookmarkPanel from './BookmarkPanel'

type Props = {
  articleId: string
  entry: { heading: string; genre: Genre }
  bookmark: { id: string; findingId: string; memo: string }
  onDeleted: () => void // 削除に成功したとき(一覧からこの項目を消してもらう)
}

// 付箋一覧の1項目(仕様: bookmark/requirements.md#付箋の一覧-10〜12、bookmark/design.md「付箋一覧からの
// 編集・削除」)。見出し(対象研究へのリンク)・ジャンルのバッジを表示し、配下にBookmarkPanelを表示する
// ことで、一覧画面だけで編集・削除が完結する(記事詳細ページに戻らない)。削除に成功したら
// onDeletedで親(BookmarkListView)に伝え、一覧から項目を消す
export default function BookmarkListItem({ articleId, entry, bookmark, onDeleted }: Props) {
  return (
    <li className="rounded-2xl bg-white p-4 shadow-sm">
      <FindingBadges genre={entry.genre} />
      <Link
        href={`/research-digest/${articleId}#${bookmark.findingId}`}
        className="mt-1 block text-sm font-bold text-teal-700 hover:underline"
      >
        {entry.heading}
      </Link>
      <BookmarkPanel
        articleId={articleId}
        findingId={bookmark.findingId}
        initialBookmark={{ id: bookmark.id, memo: bookmark.memo }}
        onChange={(next) => {
          if (next === null) onDeleted()
        }}
      />
    </li>
  )
}
