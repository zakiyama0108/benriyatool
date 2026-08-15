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

// サービス共通の抽象ロゴ(register/page.tsxのMeepleMarkと同じ意匠)。共通コンポーネント化・
// register画面側への反映はdesign.md「画面設計」の通り本specのスコープ外のため、この画面用に複製する
function MeepleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-bgr-primary">
      <path d="M12 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-3.6 7.2h7.2c1 0 1.9.7 2.1 1.7l1.5 6.4a1.1 1.1 0 0 1-1.1 1.4h-2.3l-.6 2.9a1 1 0 0 1-1 .8H8.8a1 1 0 0 1-1-.8l-.6-2.9H4.9a1.1 1.1 0 0 1-1.1-1.4l1.5-6.4c.2-1 1.1-1.7 2.1-1.7Z" />
    </svg>
  )
}

// ハート型アイコン(共通ナビの「お気に入り」項目、および空表示アイコンに使う。
// components/FavoriteButton.tsxのHeartIconと同じ意匠だが、サイズ違いのため個別に定義する)
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

// 左サイドバー(design.md「画面設計」の共通ナビ)。Stitch参照デザインではHome/Search/Add Game/
// お気に入り/Profileの5項目が並ぶが、お気に入り以外の遷移先画面は本アプリにまだ存在しない
// (game-list/game-detail等はrequirements.mdの通り仕様のみで未実装)。存在しないURLへのリンクを
// 置くと必ず404になるため、実装済みの「お気に入り」のみを残す(実装判断。詳細は実装報告を参照)
function Sidebar() {
  return (
    <aside className="hidden shrink-0 flex-col border-r border-bgr-line bg-bgr-card px-4 py-8 md:sticky md:top-0 md:flex md:h-screen md:w-64">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-bgr-line bg-bgr-bg">
          <MeepleMark />
        </div>
        <div>
          <p className="font-heading text-sm font-bold text-bgr-heading">ボドゲのトリセツ</p>
          <p className="text-xs text-bgr-subtext">アナログゲームガイド</p>
        </div>
      </div>
      <nav className="flex flex-col gap-2">
        <Link
          href="/board-game-rules/favorites"
          aria-current="page"
          className="flex items-center gap-3 rounded-lg border-l-4 border-bgr-accent bg-bgr-bg px-3 py-2 font-bold text-bgr-primary"
        >
          <HeartIcon filled className="h-4 w-4" />
          <span className="text-sm">お気に入り</span>
        </Link>
      </nav>
    </aside>
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
      <Sidebar />
      <div className="w-full flex-1">
        <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
          <nav className="flex items-center gap-1 text-xs text-bgr-subtext">
            <Link href="/" className="hover:underline">
              べんりやつーる
            </Link>
            <span>›</span>
            {/* ボドゲのトリセツのトップ(一覧・絞り込み画面)はgame-listのspecがまだ未実装のため、
                存在しないURLへリンクしないよう非リンクのテキストにする */}
            <span>ボドゲのトリセツ</span>
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
                        <p>
                          {favorite.game.minPlayers}〜{favorite.game.maxPlayers}人
                        </p>
                        <p>
                          {favorite.game.minMinutes}〜{favorite.game.maxMinutes}分
                        </p>
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
