'use client'

import { useEffect, useState } from 'react'
import { useSession } from '../lib/useSession'
import { isAuthorizedAdmin } from '../../lib/adminAuth'
import { fetchComments, createComment, type Comment } from '../lib/comments'
import CommentItem from './CommentItem'

type Props = {
  gameId: string
}

// 本文の文字数上限(comment/design.md「バリデーション」。lib/comments側のDB検証と揃える)
const MAX_BODY_LENGTH = 2000

// 取得状態(comment/design.md「状態管理」): 読み込み中/表示中/取得エラー
type LoadState = 'loading' | 'loaded' | 'error'

// ゲームごとのコメント欄(仕様: comment/design.md「画面設計」「状態管理」)。
// 一覧取得・投稿フォーム(ログイン中のみ)・権限に応じた操作の出し分けを組み立てる。
// 運営者判定はisAuthorizedAdminで行い、失敗時は非運営者として扱う(削除導線を出さない。design.md#セキュリティ)。
export default function CommentSection({ gameId }: Props) {
  const { session } = useSession()
  const [comments, setComments] = useState<Comment[]>([])
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [isAdmin, setIsAdmin] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [postFailed, setPostFailed] = useState(false)

  // 対象ゲームのコメント一覧を取得する(閲覧はログイン不要)。取得失敗はエラー表示に切り替える
  useEffect(() => {
    let active = true
    setLoadState('loading')
    void fetchComments(gameId)
      .then((list) => {
        if (!active) return
        setComments(list)
        setLoadState('loaded')
      })
      .catch(() => {
        if (active) setLoadState('error')
      })
    return () => {
      active = false
    }
  }, [gameId])

  // ログイン中のみ運営者判定を行う。失敗時は非運営者として扱う(フェイルクローズ)
  useEffect(() => {
    let active = true
    if (!session) {
      setIsAdmin(false)
      return
    }
    void isAuthorizedAdmin()
      .then((ok) => {
        if (active) setIsAdmin(ok)
      })
      .catch(() => {
        if (active) setIsAdmin(false)
      })
    return () => {
      active = false
    }
  }, [session])

  // 公開される表示名(実際に保存されるアカウント名)。Google OIDCの氏名を優先し、無ければメール
  const publishedName = session
    ? ((session.user.user_metadata?.full_name as string | undefined) || session.user.email || '')
    : ''
  const draftValid = draft.trim() !== '' && draft.trim().length <= MAX_BODY_LENGTH

  async function handlePost() {
    if (posting || !draftValid) return
    setPosting(true)
    setPostFailed(false)
    const created = await createComment(gameId, draft)
    setPosting(false)
    if (created) {
      setComments((prev) => [...prev, created])
      setDraft('')
      return
    }
    setPostFailed(true)
  }

  function handleUpdated(id: string, body: string) {
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, body } : c)))
  }

  function handleDeleted(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold text-bgr-text">コメント</h2>

      {loadState === 'error' ? (
        <p className="text-sm text-bgr-accent">コメントの取得に失敗しました。時間をおいて再度お試しください。</p>
      ) : (
        <>
          <div className="border-t border-bgr-line">
            {comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isOwn={!!session && session.user.id === comment.userId}
                isAdmin={isAdmin}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
              />
            ))}
            {loadState === 'loaded' && comments.length === 0 && (
              <p className="py-3 text-sm text-bgr-subtext">まだコメントはありません。</p>
            )}
          </div>

          {session && (
            <div className="mt-4 space-y-2">
              <textarea
                value={draft}
                maxLength={MAX_BODY_LENGTH}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="コメントを入力(ルールの補足・遊び方のコツなど)"
                className="w-full rounded-lg border border-bgr-line bg-bgr-bg p-2 text-sm"
                rows={3}
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-bgr-subtext">
                  「{publishedName}」の名前で公開されます
                </p>
                <button
                  type="button"
                  disabled={posting || !draftValid}
                  onClick={() => void handlePost()}
                  className="rounded-full border border-bgr-line bg-bgr-accent px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                >
                  投稿
                </button>
              </div>
              {postFailed && (
                <p className="text-xs text-bgr-accent">投稿に失敗しました。時間をおいて再度お試しください。</p>
              )}
            </div>
          )}
        </>
      )}
    </section>
  )
}
