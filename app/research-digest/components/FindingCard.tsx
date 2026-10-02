import type { Session } from '@supabase/supabase-js'
import type { GenreEntry } from '../lib/sortGenres'
import { COLLECTION_FAILURE_LABELS } from '../lib/types'
import FindingBadges from './FindingBadges'
import FeedbackForm from './FeedbackForm'
import BookmarkPanel, { type BookmarkSummary } from './BookmarkPanel'

type Props = {
  entry: GenreEntry
  articleId: string
  isAdmin: boolean
  session?: Session | null // ログイン中のみ付箋の操作領域を表示する(bookmark/requirements.md#記事への付箋-5)
  bookmark?: BookmarkSummary | null // この研究の取得済みの付箋(未付箋はnull/undefined)
  // 付箋の作成・編集・削除が起きたことを親(ArticleDetailView)へ伝え、記事内の付箋一覧を
  // その場で更新してもらう(bookmark/design.md「コンポーネント設計」)
  onBookmarkChange?: (findingId: string, bookmark: BookmarkSummary | null) => void
}

// 1ジャンル分の表示(仕様: requirements.md#記事本文の表示-2〜5、design.md「その回の記事本文を表示する処理」
// 手順3〜4)。研究があるジャンルは本文・出典・(運営者のみ)フィードバック入力欄を表示し、
// 掲載できなかったジャンルは理由に応じた3種の文言だけを表示する
// (候補なし・収集失敗・生成失敗で異なる文言にする。付箋を貼る対象の研究がないため付箋の操作も出さない)。
// 研究があるジャンルには、ログイン中のみ出典の下・フィードバック入力欄の上に付箋の操作領域を出す
// (bookmark/design.md「記事詳細ページへの追加」)。カード要素には研究IDのid属性を付け、
// 付箋一覧からのリンク先(/research-digest/<記事ID>#<研究ID>)にする
export default function FindingCard({ entry, articleId, isAdmin, session = null, bookmark = null, onBookmarkChange }: Props) {
  if (entry.kind === 'empty') {
    const { emptyGenre } = entry
    return (
      <div className="rounded-2xl bg-slate-50 p-4 shadow-sm sm:p-5">
        <FindingBadges genre={entry.genre} />
        <p className="mt-3 text-sm text-gray-500">
          {emptyGenre.reason === 'no-candidate' && '候補が見つかりませんでした'}
          {emptyGenre.reason === 'collection-failed' && (
            <>
              今回は記事を収集できませんでした(
              {emptyGenre.collectionFailureReason ? COLLECTION_FAILURE_LABELS[emptyGenre.collectionFailureReason] : ''})
            </>
          )}
          {emptyGenre.reason === 'generation-failed' && '今回は記事を用意できませんでした'}
        </p>
      </div>
    )
  }

  const { finding } = entry
  return (
    <div id={finding.id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <FindingBadges genre={finding.genre} impact={finding.impact} isPreprint={finding.isPreprint} />
      <h3 className="mt-2 text-base font-bold leading-relaxed">{finding.heading}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{finding.body}</p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">影響度の根拠: {finding.impactReason}</p>
      <p className="mt-3 text-xs leading-relaxed text-gray-400">
        詳しくは元の論文・発表を読む:{' '}
        <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {finding.sourceTitle}
        </a>
        (
        {finding.sourceName}
        {finding.publishedYear !== null && `、${finding.publishedYear}年`})
      </p>
      {session && (
        // 付箋の取得は非同期のため、未取得(null)でマウントされた後に取得済みの付箋が届くことがある。
        // BookmarkPanelはinitialBookmarkをuseStateの初期値としてしか使わないため、keyに付箋idを
        // 含めて取得後に再マウントし、内部状態を届いた付箋に追従させる(bookmark/requirements.md#記事への付箋-4。
        // 追従させないと付箋済みの研究にも「付箋を貼る」が表示され、保存時に一意制約違反になる)
        <BookmarkPanel
          key={bookmark?.id ?? 'none'}
          articleId={articleId}
          findingId={finding.id}
          initialBookmark={bookmark}
          onChange={(next) => onBookmarkChange?.(finding.id, next)}
        />
      )}
      {isAdmin && <FeedbackForm articleId={articleId} findingId={finding.id} />}
    </div>
  )
}
