'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '../lib/useSession'
import { signInWithGoogle } from '../../lib/adminAuth'
import { fetchMyFavoriteGames, type FavoriteGame } from '../lib/favorites'
import FavoriteButton from '../components/FavoriteButton'

// 画面の状態。セッション確認中/未ログイン/取得中/表示中の4状態
// (design.md「状態管理」。ai-dev-digest/bookmarkのBookmarkListViewと同じ構造だが、
// 権限確認(denied)は無い=利用者全員が対象のため)。favorites(取得結果)がnullの間は
// 「未取得」を表し、専用のphase状態を別途持たずに導出する(取得後はnullに戻らない配列)
type Phase = 'checking' | 'login' | 'loading' | 'ready'

// お気に入り一覧画面(仕様: requirements.md#お気に入り一覧、design.md「お気に入り一覧を
// 取得して表示する処理」「画面設計」)。セッション確認中・取得中はローディング表示のみを行い、
// 未ログイン/0件のどちらか一方に暫定的に倒さない(design.md「画面設計」)
export default function FavoritesPage() {
  const { session, loading: sessionLoading } = useSession()
  const [favorites, setFavorites] = useState<FavoriteGame[] | null>(null)

  useEffect(() => {
    let active = true
    // セッション確認中は何もしない(取得もリセットもしない)。ログアウト時はfavoritesを
    // 未取得(null)に戻し、次回ログイン時に取得中から再開する(design.md「状態管理」の状態遷移図)。
    // setState呼び出しはこの内側の非同期関数に閉じ込め、effect本体からは直接呼ばない
    async function loadOrReset() {
      if (sessionLoading) return
      if (!session) {
        setFavorites(null)
        return
      }
      try {
        const list = await fetchMyFavoriteGames()
        if (active) setFavorites(list)
      } catch (e) {
        // eslint-disable-next-line no-console -- 原因究明用。画面にはエラーを出さず「0件」として扱う(design.md#エラーハンドリング)
        console.error('お気に入り一覧: 取得に失敗しました', e)
        if (active) setFavorites([])
      }
    }
    void loadOrReset()
    return () => {
      active = false
    }
  }, [session, sessionLoading])

  const phase: Phase = sessionLoading ? 'checking' : !session ? 'login' : favorites === null ? 'loading' : 'ready'

  // その場解除(design.md「お気に入り一覧からの解除」)。解除成功時のみFavoriteButtonから
  // 呼ばれるため、一覧からその項目を取り除くだけでよい(登録側の呼び出しはこの画面では発生しない)
  function handleToggle(gameId: string, favorited: boolean) {
    if (favorited) return
    setFavorites((prev) => (prev ?? []).filter((favorite) => favorite.game.id !== gameId))
  }

  const items = favorites ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-8 sm:py-10">
        <nav className="text-[11px] text-gray-400">
          <Link href="/" className="hover:underline">
            べんりやつーる
          </Link>
          <span className="mx-1">›</span>
          <span>ボドゲのトリセツ</span>
          <span className="mx-1">›</span>
          <span>お気に入り</span>
        </nav>

        <header>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">お気に入り</h1>
        </header>

        {(phase === 'checking' || phase === 'loading') && (
          <p className="px-4 py-16 text-center text-sm text-gray-400">読み込み中…</p>
        )}

        {phase === 'login' && (
          <div className="space-y-3 rounded-2xl bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-gray-600">ログインすると、登録したお気に入りを一覧で確認できます。</p>
            <button
              onClick={() => void signInWithGoogle(window.location.href)}
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white"
            >
              Googleでログイン
            </button>
          </div>
        )}

        {phase === 'ready' &&
          (items.length === 0 ? (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
              まだお気に入りがありません。
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((favorite) => (
                <li key={favorite.favoriteId} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div>
                    <Link
                      href={`/board-game-rules/detail?id=${favorite.game.id}`}
                      className="text-sm font-bold text-emerald-700 hover:underline"
                    >
                      {favorite.game.name}
                    </Link>
                    <p className="mt-1 text-xs text-gray-500">
                      {favorite.game.minPlayers}〜{favorite.game.maxPlayers}人 / {favorite.game.minMinutes}〜{favorite.game.maxMinutes}分
                    </p>
                  </div>
                  <FavoriteButton gameId={favorite.game.id} initialFavorited={true} onToggle={handleToggle} />
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  )
}
