'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '../lib/useSession'
import { signInWithGoogle } from '../../lib/adminAuth'
import { fetchMyFavoriteGames, type FavoriteGame } from '../lib/favorites'
import { formatRange } from '../lib/gameDisplay'
import FavoriteButton from '../components/FavoriteButton'
import BoardGameNav from '../components/BoardGameNav'

// 画面の状態。セッション確認中/未ログイン/取得中/表示中の4状態
// (design.md「状態管理」。ai-dev-digest/bookmarkのBookmarkListViewと同じ構造だが、
// 権限確認(denied)は無い=利用者全員が対象のため)。favorites(取得結果)がnullの間は
// 「未取得」を表し、専用のphase状態を別途持たずに導出する(取得後はnullに戻らない配列)
type Phase = 'checking' | 'login' | 'loading' | 'ready'

// ハート型アイコン(未ログイン促し・0件の空表示アイコンに使う。共通ナビ側のアイコンは
// components/BoardGameNav.tsxが持つ。components/FavoriteButton.tsxのHeartIconと同じ意匠だが、
// サイズ・塗り分け(filled)が異なるため個別に定義する)
function HeartIcon({ filled, className }: { filled: boolean; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
    >
      <path d="M12 20.3 4.6 13.1C2.5 11 2.5 7.7 4.6 5.6c2-2 5.2-2 7.2.1l.2.2.2-.2c2-2.1 5.2-2.1 7.2-.1 2.1 2.1 2.1 5.4 0 7.5L12 20.3Z" />
    </svg>
  )
}

// 読み込み中カードのスケルトン(design.md「画面設計」STATE 1)。取得完了までの間、
// 未ログイン/0件のどちらかに暫定的に倒さないための表示専用パーツ
function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-bgr-line bg-bgr-card p-4">
      <div className="mb-4 h-28 w-full rounded-lg bg-bgr-line/60" />
      <div className="mb-2 h-4 w-3/4 rounded bg-bgr-line/60" />
      <div className="h-3 w-1/2 rounded bg-bgr-line/60" />
    </div>
  )
}

// お気に入り一覧画面(仕様: requirements.md#お気に入り一覧、design.md「お気に入り一覧を
// 取得して表示する処理」「画面設計」)。セッション確認中・取得中はローディング表示のみを行い、
// 未ログイン/0件のどちらか一方に暫定的に倒さない(design.md「画面設計」)。見た目はStep0で
// 確定したGoogle Stitch生成デザイン(デザインシステム「Analog Hearth」)に合わせる
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
    <div className="font-body flex min-h-screen bg-bgr-bg">
      <BoardGameNav active="favorites" />
      <div className="w-full flex-1">
        <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
          <nav aria-label="パンくず" className="flex items-center gap-1 text-xs text-bgr-subtext">
            <Link href="/" className="hover:underline">
              べんりやつーる
            </Link>
            <span>›</span>
            <Link href="/board-game-rules" className="hover:underline">
              ボドゲのトリセツ
            </Link>
            <span>›</span>
            <span className="font-bold text-bgr-heading">お気に入り</span>
          </nav>

          <h1 className="font-heading text-2xl font-bold text-bgr-heading">お気に入り</h1>

          {(phase === 'checking' || phase === 'loading') && (
            <div className="space-y-4">
              <p className="text-sm text-bgr-subtext">読み込み中…</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>
          )}

          {phase === 'login' && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-bgr-line bg-bgr-card p-10 text-center">
              <HeartIcon filled={false} className="h-10 w-10 text-bgr-subtext" />
              <p className="text-sm text-bgr-subtext">
                ログインすると、登録したお気に入りを一覧で確認できます。
              </p>
              <button
                onClick={() => void signInWithGoogle(window.location.href)}
                className="rounded-lg bg-bgr-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-bgr-primary-active"
              >
                Googleでログイン
              </button>
            </div>
          )}

          {phase === 'ready' &&
            (items.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-bgr-line bg-bgr-card p-10 text-center">
                <HeartIcon filled={false} className="h-10 w-10 text-bgr-line" />
                <p className="text-sm text-bgr-subtext">まだお気に入りがありません。</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map((favorite) => (
                  <li
                    key={favorite.favoriteId}
                    className="relative flex flex-col overflow-hidden rounded-2xl border border-bgr-line bg-bgr-card"
                  >
                    <div className="absolute right-2 top-2 z-10">
                      <FavoriteButton gameId={favorite.game.id} initialFavorited={true} onToggle={handleToggle} />
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <Link
                        href={`/board-game-rules/detail?id=${favorite.game.id}`}
                        className="font-heading text-base font-bold text-bgr-heading after:absolute after:inset-0 after:content-['']"
                      >
                        {favorite.game.name}
                      </Link>
                      <div className="mt-2 space-y-1 text-xs text-bgr-subtext">
                        {/* 対応人数・プレイ時間は根拠が得られた場合のみ埋まるため未登録(NULL)のことがある。
                            未登録は「不明」と表示する(admin/requirements.md#登録実行のローカル処理起動-13) */}
                        <p>{formatRange(favorite.game.minPlayers, favorite.game.maxPlayers) ?? '不明'}人</p>
                        <p>{formatRange(favorite.game.minMinutes, favorite.game.maxMinutes) ?? '不明'}分</p>
                      </div>
                      {favorite.game.genres.length > 0 && (
                        <div className="mt-auto flex flex-wrap gap-2 pt-4">
                          {favorite.game.genres.map((genre) => (
                            <span
                              key={genre}
                              className="rounded border border-bgr-line bg-bgr-bg px-2 py-1 text-xs text-bgr-subtext"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ))}
        </main>
      </div>
    </div>
  )
}
