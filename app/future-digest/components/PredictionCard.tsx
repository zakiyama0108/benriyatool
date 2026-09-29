import type { Session } from '@supabase/supabase-js'
import type { Slot } from '../lib/sortSlots'
import { COLLECTION_FAILURE_LABELS } from '../lib/types'
import SlotBadges from './SlotBadges'
import FeedbackForm from './FeedbackForm'
import BookmarkPanel, { type BookmarkSummary } from './BookmarkPanel'

type Props = {
  slot: Slot
  articleId: string
  isAdmin: boolean
  session?: Session | null // ログイン中のみ付箋の操作領域を表示する(bookmark/requirements.md#記事への付箋-5)
  bookmark?: BookmarkSummary | null // この予測の取得済みの付箋(未付箋はnull/undefined)
  // 付箋の作成・編集・削除が起きたことを親(ArticleDetailView)へ伝え、記事内の付箋一覧を
  // その場で更新してもらう(bookmark/design.md「コンポーネント設計」)
  onBookmarkChange?: (predictionId: string, bookmark: BookmarkSummary | null) => void
}

// 1枠分の表示(仕様: requirements.md#記事本文の表示-2〜5、design.md「その回の記事本文を表示する処理」
// 手順3〜4。付箋の操作領域はbookmark/design.md「記事詳細ページへの追加(article-detailの画面)」)。
// 予測がある枠は本文・出典・(ログイン中のみ)付箋の操作領域・(運営者のみ)フィードバック入力欄を
// 表示し、掲載できなかった枠は理由に応じた3種の文言だけを表示する(候補なし・収集失敗・生成失敗で
// 異なる文言にする。付箋を貼る対象の予測がないため付箋の操作も出さない)
export default function PredictionCard({ slot, articleId, isAdmin, session = null, bookmark = null, onBookmarkChange }: Props) {
  if (slot.kind === 'empty') {
    const { emptySlot } = slot
    return (
      <div className="rounded-2xl bg-slate-50 p-4 shadow-sm sm:p-5">
        <SlotBadges genre={slot.genre} horizon={slot.horizon} />
        <p className="mt-3 text-sm text-gray-500">
          {emptySlot.reason === 'no-candidate' && '候補が見つかりませんでした'}
          {emptySlot.reason === 'collection-failed' && (
            <>
              今回は記事を収集できませんでした(
              {COLLECTION_FAILURE_LABELS[emptySlot.collectionFailureReason!]})
            </>
          )}
          {emptySlot.reason === 'generation-failed' && '今回は記事を用意できませんでした'}
        </p>
      </div>
    )
  }

  const { prediction } = slot
  return (
    <div id={prediction.id} className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <SlotBadges genre={slot.genre} horizon={slot.horizon} impact={prediction.impact} />
      <p className="mt-2 text-[11px] text-gray-400">{prediction.targetPeriod}</p>
      <h3 className="mt-1 text-base font-bold leading-relaxed">{prediction.heading}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{prediction.body}</p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">影響度の根拠: {prediction.impactReason}</p>
      <p className="mt-3 text-xs leading-relaxed text-gray-400">
        詳しくは元記事を読む:{' '}
        <a href={prediction.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {prediction.sourceName}『{prediction.sourceTitle}』
        </a>
      </p>

      {session && (
        // 付箋の取得は非同期のため、未取得(null)でマウントされた後に取得済みの付箋が届くことがある。
        // BookmarkPanelはinitialBookmarkをuseStateの初期値としてしか使わないため、keyに付箋idを
        // 含めて取得後に再マウントし、内部状態を届いた付箋に追従させる(bookmark/requirements.md#記事への付箋-4。
        // 追従させないと付箋済みの予測にも「付箋を貼る」が表示され、保存時に一意制約違反になる)
        <BookmarkPanel
          key={bookmark?.id ?? 'none'}
          articleId={articleId}
          predictionId={prediction.id}
          initialBookmark={bookmark}
          onChange={(next) => onBookmarkChange?.(prediction.id, next)}
        />
      )}
      {isAdmin && <FeedbackForm articleId={articleId} predictionId={prediction.id} />}
    </div>
  )
}
