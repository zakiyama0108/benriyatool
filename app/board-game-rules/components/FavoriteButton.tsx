'use client'

import { useState } from 'react'
import { useSession } from '../lib/useSession'
import { addFavorite, removeFavorite } from '../lib/favorites'

type Props = {
  gameId: string
  // 表示開始時点で登録済みかどうか(一覧・詳細・お気に入り一覧が呼び出し元でまとめて取得した
  // game_id集合から渡す。design.md「状態管理」)。以降の登録・解除の成否は本コンポーネントが
  // 自身のローカル状態として持つ(bookmark/SaveButtonの状態管理と同じ考え方)
  initialFavorited: boolean
  // トグルが成功した時に呼ばれる(gameId, 変更後の登録状態)。お気に入り一覧画面が
  // 解除成功時に一覧からその項目を取り除くのに使う(design.md「お気に入り一覧からの解除」)
  onToggle?: (gameId: string, favorited: boolean) => void
}

// 1ゲーム分のお気に入りトグルボタン(design.md「状態管理」「関連するファイル」)。
// 一覧カード・詳細・お気に入り一覧のいずれからも使う共通コンポーネント。
// 未ログインでは何も表示しない(ログイン導線はヘッダーのLoginStatusに集約する。
// requirements.md#お気に入りの登録・解除-2、design.md「画面設計」で「表示しない」に確定)
export default function FavoriteButton({ gameId, initialFavorited, onToggle }: Props) {
  const { session } = useSession()
  const [favorited, setFavorited] = useState(initialFavorited)
  const [processing, setProcessing] = useState(false)
  const [failed, setFailed] = useState(false)

  if (!session) return null

  async function handleClick() {
    if (processing) return
    setProcessing(true)
    setFailed(false)
    const next = !favorited
    const ok = next ? await addFavorite(gameId) : await removeFavorite(gameId)
    setProcessing(false)
    if (ok) {
      setFavorited(next)
      onToggle?.(gameId, next)
      return
    }
    // 失敗時は表示を変えず、失敗が分かる定型表示のみ出す(design.md#エラーハンドリング)。
    // Supabaseの生エラーは出さず、原因究明用にコンソールへのみ出す(design.md#ログ)
    // eslint-disable-next-line no-console
    console.error(`お気に入りの${next ? '登録' : '解除'}に失敗しました`, { gameId })
    setFailed(true)
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-pressed={favorited}
        disabled={processing}
        onClick={() => void handleClick()}
        className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 disabled:opacity-50"
      >
        {favorited ? '★ お気に入り済み' : '☆ お気に入り'}
      </button>
      {failed && <span className="text-xs text-red-600">失敗しました</span>}
    </span>
  )
}
