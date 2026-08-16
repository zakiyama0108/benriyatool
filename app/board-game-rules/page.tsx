'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import BoardGameNav from './components/BoardGameNav'
import LoginStatus from './components/LoginStatus'
import FilterPanel from './components/FilterPanel'
import GameCard from './components/GameCard'
import { fetchPublishedGames, type Game } from './lib/games'
import { EMPTY_FILTERS, buildFilterOptions, filterGames, type GameFilters } from './lib/filterGames'
import { useSession } from './lib/useSession'
import { fetchMyFavoriteGameIds } from './lib/favorites'

// 取得状態(design.md「状態管理」の状態遷移図: 読み込み中→表示中 or 取得エラー、取得エラー→再試行で読み込み中へ)
type Phase = 'loading' | 'ready' | 'error'

// このアプリのトップ画面(仕様: requirements.md#概要、design.md)。公開中ゲームを全件取得し、
// 絞り込みは取得済みデータへ画面側で適用する(条件変更のたびの再取得はしない。design.md「絞り込みを
// 適用する処理」補足)。お気に入り集合はログイン中のみ1回まとめて取得し、未ログイン・取得失敗・
// 取得完了までは一律「未登録」として扱う(favorite/design.md「画面内のお気に入り状態をまとめて取得する処理」)
export default function BoardGameRulesHomePage() {
  const { session } = useSession()
  const [games, setGames] = useState<Game[]>([])
  const [phase, setPhase] = useState<Phase>('loading')
  const [filters, setFilters] = useState<GameFilters>(EMPTY_FILTERS)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // 初回マウント時のみ取得する(絞り込み条件変更では再取得しない。design.md「絞り込みを適用する処理」補足)。
    // 取得関数をeffect内に閉じて定義する(react-hooks/set-state-in-effectが、effect外で定義した
    // 関数呼び出し越しの同期setStateを検出しづらいため。favorites/page.tsxのloadOrResetと同方針)
    async function loadGames() {
      try {
        const list = await fetchPublishedGames()
        setGames(list)
        setPhase('ready')
      } catch (e) {
        // eslint-disable-next-line no-console -- 原因究明用。画面には定型のエラー表示のみ出す(design.md#ログ)
        console.error('ゲーム一覧: 取得に失敗しました', e)
        setPhase('error')
      }
    }
    void loadGames()
  }, [])

  // 再試行(取得エラー時のボタン)。同じ取得処理をここでも定義する(上記effect内のloadGamesは
  // クロージャがeffectに閉じているため呼び出せない)
  function handleRetry() {
    setPhase('loading')
    void (async () => {
      try {
        const list = await fetchPublishedGames()
        setGames(list)
        setPhase('ready')
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('ゲーム一覧: 取得に失敗しました', e)
        setPhase('error')
      }
    })()
  }

  useEffect(() => {
    let active = true
    async function loadFavorites() {
      if (!session) {
        setFavoriteIds(new Set())
        return
      }
      try {
        const ids = await fetchMyFavoriteGameIds()
        if (active) setFavoriteIds(ids)
      } catch (e) {
        // eslint-disable-next-line no-console -- 原因究明用。取得失敗時も一律「未登録」として扱う
        console.error('お気に入り状態: 取得に失敗しました', e)
        if (active) setFavoriteIds(new Set())
      }
    }
    void loadFavorites()
    return () => {
      active = false
    }
  }, [session])

  // その場のお気に入りトグル結果を画面内のお気に入り集合へ反映する(各カードのFavoriteButtonから通知される)
  function handleToggleFavorite(gameId: string, favorited: boolean) {
    setFavoriteIds((prev) => {
      const next = new Set(prev)
      if (favorited) next.add(gameId)
      else next.delete(gameId)
      return next
    })
  }

  const options = buildFilterOptions(games)
  const filteredGames = filterGames(games, filters)

  return (
    <div className="font-body flex min-h-screen bg-bgr-bg">
      <BoardGameNav active="list" />
      <div className="w-full flex-1">
        <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-8">
          <div className="flex items-center justify-between gap-2">
            <nav aria-label="パンくず" className="flex items-center gap-1 text-xs text-bgr-subtext">
              <Link href="/" className="hover:underline">
                べんりやつーる
              </Link>
              <span>›</span>
              <Link href="/board-game-rules" className="hover:underline">
                ボドゲのトリセツ
              </Link>
              <span>›</span>
              <span className="font-bold text-bgr-heading">一覧</span>
            </nav>
            <LoginStatus />
          </div>

          {phase === 'loading' && <p className="text-sm text-bgr-subtext">読み込み中…</p>}

          {phase === 'error' && (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-bgr-line bg-bgr-card p-10 text-center">
              <p className="text-sm text-bgr-subtext">ゲーム一覧の取得に失敗しました。</p>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-lg bg-bgr-primary px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-bgr-primary-active"
              >
                再試行
              </button>
            </div>
          )}

          {phase === 'ready' && (
            <>
              <FilterPanel options={options} filters={filters} onChange={setFilters} />

              <p className="text-sm text-bgr-subtext">{filteredGames.length}件</p>

              {filteredGames.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-bgr-line bg-bgr-card p-10 text-center">
                  <p className="text-sm text-bgr-subtext">条件に合うゲームが見つかりませんでした</p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredGames.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      favorited={favoriteIds.has(game.id)}
                      onToggleFavorite={handleToggleFavorite}
                    />
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
