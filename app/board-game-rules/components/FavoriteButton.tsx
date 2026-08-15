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

// ハート型アイコン(Analog Hearthの見た目に合わせた自前SVG。design.md「画面設計」のカード右上
// バッジと同じ意匠。外部アイコンフォント(Material Symbols等)は使わず、register/page.tsxの
// MeepleMarkと同様にプロジェクト内で完結するinline SVGにする)
function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-3.5 w-3.5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.8}
    >
      <path d="M12 20.3 4.6 13.1C2.5 11 2.5 7.7 4.6 5.6c2-2 5.2-2 7.2.1l.2.2.2-.2c2-2.1 5.2-2.1 7.2-.1 2.1 2.1 2.1 5.4 0 7.5L12 20.3Z" />
    </svg>
  )
}

// 1ゲーム分のお気に入りトグルボタン(design.md「状態管理」「関連するファイル」)。
// 一覧カード・詳細・お気に入り一覧のいずれからも使う共通コンポーネント。見た目はAnalog Hearth
// (design.md「画面設計」のカード右上バッジ)に合わせる
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
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        aria-pressed={favorited}
        disabled={processing}
        onClick={() => void handleClick()}
        className={`inline-flex items-center gap-1 rounded-full border border-bgr-line bg-bgr-bg px-2 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
          favorited ? 'text-bgr-accent' : 'text-bgr-subtext hover:text-bgr-accent'
        }`}
      >
        <HeartIcon filled={favorited} />
        {favorited ? 'お気に入り済' : 'お気に入り'}
      </button>
      {failed && <span className="text-xs text-bgr-accent">失敗しました</span>}
    </span>
  )
}
