'use client'

import { useState } from 'react'
import { createBookmark, updateBookmark, deleteBookmark } from '../lib/bookmarks'

export type BookmarkSummary = { id: string; memo: string }

type Props = {
  articleDate: string
  topicId: string
  initialBookmark: BookmarkSummary | null
  onChange?: (bookmark: BookmarkSummary | null) => void
}

const MEMO_MAX_LENGTH = 200

// 1トピック分の付箋の表示・新規作成・編集・削除(仕様: requirements.md#トピックへの付箋-1〜4、
// requirements.md#付箋の編集・削除-7〜9、design.md「新規に付箋を貼る処理」〜「付箋を削除する処理」
// 「状態管理」)。記事詳細ページ・付箋一覧ページの両方から使う共通コンポーネント。
// 未付箋/付箋あり/編集中の3状態をコンポーネント内で持ち、トピックをまたいで共有しない
// (design.md「状態管理」。FeedbackForm.tsxと同じ方式)
export default function BookmarkPanel({ articleDate, topicId, initialBookmark, onChange }: Props) {
  const [bookmark, setBookmark] = useState<BookmarkSummary | null>(initialBookmark)
  const [isEditing, setIsEditing] = useState(false)
  const [memo, setMemo] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveFailed, setSaveFailed] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteFailed, setDeleteFailed] = useState(false)

  // トリムした文字列が空文字、または200文字を超える場合は保存できない
  // (requirements.md#トピックへの付箋-2〜3。maxLengthで200字は入力欄自体でも制限する)
  const trimmedMemo = memo.trim()
  const isSendable = trimmedMemo.length > 0 && trimmedMemo.length <= MEMO_MAX_LENGTH && !isSaving

  function startEditing() {
    setMemo(bookmark?.memo ?? '')
    setSaveFailed(false)
    setIsEditing(true)
  }

  function cancelEditing() {
    setIsEditing(false)
    setSaveFailed(false)
  }

  async function handleSave() {
    if (!isSendable) return
    setIsSaving(true)
    setSaveFailed(false)

    if (bookmark) {
      // 既に付箋済みのトピックへの操作は新規作成ではなく既存の付箋の編集として扱う
      // (requirements.md#トピックへの付箋-4)
      const ok = await updateBookmark(bookmark.id, trimmedMemo)
      setIsSaving(false)
      if (ok) {
        const updated = { id: bookmark.id, memo: trimmedMemo }
        setBookmark(updated)
        setIsEditing(false)
        onChange?.(updated)
      } else {
        setSaveFailed(true)
      }
      return
    }

    const id = await createBookmark({ articleDate, topicId, memo: trimmedMemo })
    setIsSaving(false)
    if (id) {
      const created = { id, memo: trimmedMemo }
      setBookmark(created)
      setIsEditing(false)
      onChange?.(created)
    } else {
      setSaveFailed(true)
    }
  }

  async function handleDelete() {
    if (!bookmark || isDeleting) return
    setIsDeleting(true)
    setDeleteFailed(false)
    const ok = await deleteBookmark(bookmark.id)
    setIsDeleting(false)
    if (ok) {
      setBookmark(null)
      onChange?.(null)
    } else {
      setDeleteFailed(true)
    }
  }

  if (isEditing) {
    return (
      <div className="mt-3 space-y-2">
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          maxLength={MEMO_MAX_LENGTH}
          placeholder="気になった理由やメモを入力(200文字まで)"
          className="w-full rounded-xl border border-gray-200 p-2.5 text-sm outline-none focus:border-teal-400"
          rows={2}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!isSendable}
            className="rounded-full bg-teal-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm disabled:opacity-50"
          >
            保存
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            disabled={isSaving}
            className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-bold text-gray-500 disabled:opacity-50"
          >
            キャンセル
          </button>
          {saveFailed && <span className="text-xs text-red-600">保存に失敗しました。もう一度お試しください</span>}
        </div>
      </div>
    )
  }

  if (bookmark) {
    return (
      <div className="mt-3 space-y-1.5 rounded-xl bg-amber-50 p-2.5">
        <p className="text-sm leading-relaxed text-amber-900">{bookmark.memo}</p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={startEditing} className="text-xs font-bold text-teal-600">
            編集
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isDeleting}
            className="text-xs font-bold text-red-500 disabled:opacity-50"
          >
            削除
          </button>
          {deleteFailed && <span className="text-xs text-red-600">削除に失敗しました。もう一度お試しください</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={startEditing}
        className="rounded-full border border-amber-300 px-3 py-1 text-xs font-bold text-amber-600"
      >
        付箋を貼る
      </button>
    </div>
  )
}
