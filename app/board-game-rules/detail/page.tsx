'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '../lib/useSession'
import { isAuthorizedAdmin } from '../../lib/adminAuth'
import { fetchGameById, type Game } from '../lib/games'
import { fetchMyFavoriteGameIds } from '../lib/favorites'
import BoardGameNav from '../components/BoardGameNav'
import PhotoGallery from '../components/PhotoGallery'
import GameInfo from '../components/GameInfo'
import RuleTabs from '../components/RuleTabs'
import FavoriteButton from '../components/FavoriteButton'
import CommentSection from '../components/CommentSection'
import ReportButton from '../components/ReportButton'
import AdminControls from '../components/AdminControls'

// 取得状態(game-detail/design.md「状態管理」の状態遷移図): 読み込み中/表示中/該当なし/取得エラー
type Phase = 'loading' | 'found' | 'notFound' | 'error'

// ゲーム詳細画面(仕様: game-detail/design.md「画面設計」「対象ゲームを取得して表示する処理」)。
// 静的エクスポート下でクエリのIDからゲームを取得する(design.md「詳細画面のルーティング」)。
// 閲覧はログイン不要。お気に入り・コメント投稿のみログインが必要(各コンポーネント側で出し分ける)。
export default function GameDetailPage() {
  const { session } = useSession()
  const [gameId, setGameId] = useState('')
  const [phase, setPhase] = useState<Phase>('loading')
  const [game, setGame] = useState<Game | null>(null)
  const [favorited, setFavorited] = useState(false)
  const [favoritesResolved, setFavoritesResolved] = useState(false)
  // 運営者(管理者)かどうか。ログイン中のみisAuthorizedAdminで判定し、失敗時は非運営者扱い(フェイルクローズ)
  const [isAdmin, setIsAdmin] = useState(false)
  // 取得エラーからの再試行(design.md「状態管理」: 取得エラー→読み込み中)でこの値を増やして再取得する
  const [reloadKey, setReloadKey] = useState(0)

  // クエリのIDで対象ゲームを取得する。IDの読み取りはブラウザ上でのみ行う(静的エクスポート)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id') ?? ''
    setGameId(id)
    let active = true
    setPhase('loading')
    void fetchGameById(id).then((result) => {
      if (!active) return
      if (result.status === 'found') {
        setGame(result.game)
        setPhase('found')
      } else if (result.status === 'notFound') {
        setPhase('notFound')
      } else {
        setPhase('error')
      }
    })
    return () => {
      active = false
    }
  }, [reloadKey])

  // ログイン中は、この画面のお気に入り状態を集合取得で判定して初期値に渡す
  // (favorite/design.md「画面内のお気に入り状態をまとめて取得する処理」)。
  // 取得完了まで・取得失敗時・未ログインは一律「未登録」として扱う。
  useEffect(() => {
    if (phase !== 'found' || !game) return
    let active = true
    setFavoritesResolved(false)
    if (!session) {
      setFavorited(false)
      setFavoritesResolved(true)
      return
    }
    void fetchMyFavoriteGameIds()
      .then((ids) => {
        if (!active) return
        setFavorited(ids.has(game.id))
        setFavoritesResolved(true)
      })
      .catch(() => {
        if (!active) return
        setFavorited(false)
        setFavoritesResolved(true)
      })
    return () => {
      active = false
    }
  }, [session, phase, game])

  // ログイン中のみ運営者判定を行う。失敗時は非運営者として扱う(フェイルクローズ。design.md#セキュリティ)
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

  return (
    <div className="font-body flex min-h-screen bg-bgr-bg">
      <BoardGameNav active="list" />
      <div className="w-full flex-1">
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-8">
          <nav aria-label="パンくず" className="flex items-center gap-1 text-xs text-bgr-subtext">
            <Link href="/" className="hover:underline">
              べんりやつーる
            </Link>
            <span>›</span>
            <Link href="/board-game-rules" className="hover:underline">
              ボドゲのトリセツ
            </Link>
            <span>›</span>
            <Link href="/board-game-rules" className="hover:underline">
              一覧
            </Link>
            {phase === 'found' && game && (
              <>
                <span>›</span>
                <span className="font-bold text-bgr-heading">{game.name}</span>
              </>
            )}
          </nav>

          {phase === 'loading' && <p className="py-16 text-center text-sm text-bgr-subtext">読み込み中…</p>}

          {phase === 'notFound' && (
            <div className="py-16 text-center">
              <p className="text-sm text-bgr-text">お探しのゲームは見つかりませんでした。</p>
              <Link href="/board-game-rules" className="mt-3 inline-block text-sm text-bgr-accent underline">
                一覧へ戻る
              </Link>
            </div>
          )}

          {phase === 'error' && (
            <div className="space-y-3 py-16 text-center">
              <p className="text-sm text-bgr-text">ゲーム情報の取得に失敗しました。</p>
              <button
                type="button"
                onClick={() => setReloadKey((n) => n + 1)}
                className="rounded-lg border border-bgr-line px-4 py-2 text-sm text-bgr-text"
              >
                再試行
              </button>
            </div>
          )}

          {phase === 'found' && game && (
            <>
              <PhotoGallery paths={game.introPhotoPaths} />
              <GameInfo game={game} />

              {isAdmin && (
                <AdminControls
                  game={game}
                  onChanged={() => setReloadKey((n) => n + 1)}
                  onDeleted={() => window.location.assign('/board-game-rules')}
                />
              )}

              <div className="flex items-center justify-between gap-3">
                {/* お気に入り状態の集合取得が済んでから確定した初期値でマウントする(keyで再マウント) */}
                <FavoriteButton
                  key={favoritesResolved ? `resolved-${favorited}` : 'pending'}
                  gameId={game.id}
                  initialFavorited={favorited}
                />
                <ReportButton gameId={game.id} />
              </div>

              <RuleTabs rulesSimple={game.rulesSimple} rulesDetailed={game.rulesDetailed} />

              <CommentSection gameId={game.id} />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
