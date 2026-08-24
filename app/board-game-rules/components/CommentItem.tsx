'use client'

import { useState } from 'react'
import { updateComment, deleteComment, type Comment } from '../lib/comments'

type Props = {
  comment: Comment
  // 投稿者本人か(CommentSectionがログイン中のuser_idと比較して渡す)。編集・削除の出し分けに使う
  isOwn: boolean
  // 運営者か(CommentSectionがisAuthorizedAdminの結果を渡す)。運営者は削除のみ可(編集不可)
  isAdmin: boolean
  // 編集成功時に親へ更新後本文を通知する(親が一覧の該当行を差し替える)
  onUpdated: (id: string, body: string) => void
  // 削除成功時に親へ通知する(親が一覧から取り除く)
  onDeleted: (id: string) => void
}

// 本文の文字数上限(comment/design.md「バリデーション」。lib/comments側のDB検証と揃える)
const MAX_BODY_LENGTH = 2000

// 投稿日時を「2026/8/1 18:30」形式で表示する。表示のみのため簡易整形にとどめる
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const date = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
  const time = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
}

// 1コメントの表示・編集・削除(仕様: comment/design.md「画面設計」「状態管理」)。
// 「表示中」「編集中」「処理中」の3状態を持つ。本文・表示名はReactの既定エスケープで描画し、
// HTMLとして解釈しない(dangerouslySetInnerHTMLを使わない。design.md#セキュリティ)。
export default function CommentItem({ comment, isOwn, isAdmin, onUpdated, onDeleted }: Props) {
  const [body, setBody] = useState(comment.body)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [processing, setProcessing] = useState(false)
  const [failed, setFailed] = useState(false)

  // 編集本文が投稿と同じ検証(トリム後の空・上限超過)を満たすか。満たさなければ保存を無効化する
  const draftValid = draft.trim() !== '' && draft.trim().length <= MAX_BODY_LENGTH

  function startEdit() {
    setDraft(body)
    setFailed(false)
    setEditing(true)
  }

  async function handleSave() {
    if (processing || !draftValid) return
    setProcessing(true)
    setFailed(false)
    const trimmed = draft.trim()
    const ok = await updateComment(comment.id, trimmed)
    setProcessing(false)
    if (ok) {
      setBody(trimmed)
      setEditing(false)
      onUpdated(comment.id, trimmed)
      return
    }
    // 失敗時は編集欄を開いたまま入力を保持し、失敗が分かる表示のみ出す(design.md#エラーハンドリング)
    setFailed(true)
  }

  async function handleDelete() {
    if (processing) return
    setProcessing(true)
    setFailed(false)
    const ok = await deleteComment(comment.id)
    if (ok) {
      onDeleted(comment.id)
      return
    }
    setProcessing(false)
    setFailed(true)
  }

  return (
    <div className="border-b border-bgr-line py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-bgr-text">{comment.authorName}</span>
        <span className="text-xs text-bgr-subtext">{formatDateTime(comment.createdAt)}</span>
      </div>

      {editing ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={draft}
            maxLength={MAX_BODY_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-lg border border-bgr-line bg-bgr-bg p-2 text-sm"
            rows={3}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={processing || !draftValid}
              onClick={() => void handleSave()}
              className="rounded-full border border-bgr-line bg-bgr-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
            >
              保存
            </button>
            <button
              type="button"
              disabled={processing}
              onClick={() => setEditing(false)}
              className="rounded-full border border-bgr-line px-3 py-1 text-xs text-bgr-subtext disabled:opacity-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-bgr-text">{body}</p>
      )}

      {(isOwn || isAdmin) && !editing && (
        <div className="mt-2 flex items-center gap-3 text-xs">
          {isOwn && (
            <button type="button" onClick={startEdit} className="text-bgr-subtext hover:text-bgr-accent">
              編集
            </button>
          )}
          <button
            type="button"
            disabled={processing}
            onClick={() => void handleDelete()}
            className="text-bgr-subtext hover:text-bgr-accent disabled:opacity-50"
          >
            削除
          </button>
        </div>
      )}

      {failed && <p className="mt-1 text-xs text-bgr-accent">操作に失敗しました。時間をおいて再度お試しください。</p>}
    </div>
  )
}
