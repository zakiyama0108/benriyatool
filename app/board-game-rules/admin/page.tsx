'use client'

import { useEffect, useState } from 'react'
import { getSession, onAuthChange, isAuthorizedAdmin, signInWithGoogle, signOut } from '../../lib/adminAuth'
import { fetchAdminGames, type AdminGame } from './lib/fetchAdminGames'
import { fetchReports, type Report } from './lib/fetchReports'
import { fetchGameRequests, markGameRequestProcessed, deleteGameRequest } from './lib/gameRequests'
import { editGame, deleteGame, type GameEditInput } from './lib/moderation'
import { fetchOriginalPhotos } from './lib/photos'
import LoginScreen from './components/LoginScreen'
import GameModerationTable from './components/GameModerationTable'
import GameEditForm from './components/GameEditForm'
import ReportsView from './components/ReportsView'
import GameRequestsView from './components/GameRequestsView'

// 画面の状態。未ログイン/権限なし/権限あり(閲覧可)/認証確認中/認証確認エラー
// (仕様: admin/design.md「状態管理」。ikukyu/admin・life-money-sim/adminと同一方針)
type Phase = 'loading' | 'login' | 'denied' | 'authorized' | 'authError'

// コメントの削除(requirements.md#コメントの削除-11)は、この管理ダッシュボードではなく
// comment specのゲーム詳細画面(CommentItem.tsx、未実装)側で運営者判定つきの削除操作として
// 提供する想定のため、本ページには専用UIを置かない(admin/design.mdの画面設計にも
// コメント一覧セクションはない)。DB操作自体はmoderation.tsのdeleteCommentとして実装済み。
export default function AdminPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [email, setEmail] = useState<string | null>(null)

  const [games, setGames] = useState<AdminGame[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof fetchGameRequests>>>([])
  const [dataError, setDataError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingGameId, setEditingGameId] = useState<string | null>(null)
  // 編集・削除・処理済みマークなど各操作の成功後にインクリメントし、下のeffectを再実行して最新化する
  const [reloadCount, setReloadCount] = useState(0)

  useEffect(() => {
    let active = true
    async function checkAuth() {
      const session = await getSession()
      if (!active) return
      if (!session) {
        setPhase('login')
        setEmail(null)
        return
      }
      setEmail(session.user.email ?? null)
      try {
        const ok = await isAuthorizedAdmin()
        if (!active) return
        setPhase(ok ? 'authorized' : 'denied')
      } catch {
        if (active) setPhase('authError')
      }
    }
    void checkAuth()
    const unsubscribe = onAuthChange(() => void checkAuth())
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (phase !== 'authorized') return
    let active = true
    async function load() {
      setLoading(true)
      setDataError(false)
      try {
        const [gamesResult, reportsResult, requestsResult] = await Promise.all([
          fetchAdminGames(),
          fetchReports(),
          fetchGameRequests(),
        ])
        if (!active) return
        setGames(gamesResult)
        setReports(reportsResult)
        setRequests(requestsResult)
      } catch (e) {
        if (!active) return
        // eslint-disable-next-line no-console -- 原因究明用(design.md#ログ)
        console.error('管理画面: モデレーションデータの取得に失敗しました', e)
        setDataError(true)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [phase, reloadCount])

  function reload() {
    setReloadCount((n) => n + 1)
  }

  async function handleSaveGame(input: GameEditInput): Promise<boolean> {
    const ok = await editGame(input)
    if (ok) reload()
    return ok
  }

  async function handleDeleteGame(id: string) {
    const ok = await deleteGame(id)
    if (ok) reload()
  }

  async function handleMarkProcessed(id: string) {
    const ok = await markGameRequestProcessed(id)
    if (ok) reload()
  }

  async function handleDeleteRequest(id: string) {
    const ok = await deleteGameRequest(id)
    if (ok) reload()
  }

  if (phase === 'loading') {
    return <p className="px-4 py-16 text-center text-sm text-gray-400">読み込み中…</p>
  }

  if (phase === 'login') {
    return (
      <LoginScreen
        variant="login"
        onLogin={() => void signInWithGoogle(`${window.location.origin}/board-game-rules/admin/`)}
        onLogout={() => void signOut()}
      />
    )
  }

  if (phase === 'denied') {
    return <LoginScreen variant="denied" onLogin={() => {}} onLogout={() => void signOut()} />
  }

  if (phase === 'authError') {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center space-y-4">
        <p className="text-sm text-gray-700">閲覧権限の確認に失敗しました。時間をおいて再度お試しください。</p>
        <button onClick={() => window.location.reload()} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">
          再試行
        </button>
      </div>
    )
  }

  // phase === 'authorized'
  const editingGame = games.find((g) => g.id === editingGameId) ?? null

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">管理画面</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {email && <span>{email}</span>}
          <button onClick={() => void signOut()} className="rounded border border-gray-300 px-3 py-1">
            ログアウト
          </button>
        </div>
      </div>

      {dataError ? (
        <div className="space-y-3 py-8 text-center">
          <p className="text-sm text-gray-700">データの取得に失敗しました。</p>
          <button onClick={reload} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700">
            再試行
          </button>
        </div>
      ) : loading ? (
        <p className="py-8 text-center text-sm text-gray-400">読み込み中…</p>
      ) : (
        <>
          {editingGame && (
            <section className="space-y-2">
              <h2 className="text-lg font-bold">ゲームを編集</h2>
              <GameEditForm game={editingGame} onSave={handleSaveGame} onCancel={() => setEditingGameId(null)} />
            </section>
          )}

          <section className="space-y-2">
            <h2 className="text-lg font-bold">登録依頼</h2>
            <GameRequestsView
              requests={requests}
              onMarkProcessed={(id) => void handleMarkProcessed(id)}
              onDelete={(id) => void handleDeleteRequest(id)}
              onViewPhotos={fetchOriginalPhotos}
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold">通報</h2>
            <ReportsView reports={reports} games={games} onSelectGame={setEditingGameId} />
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-bold">ゲーム一覧</h2>
            <GameModerationTable
              games={games}
              onEdit={setEditingGameId}
              onDelete={(id) => void handleDeleteGame(id)}
              onViewPhotos={fetchOriginalPhotos}
            />
          </section>
        </>
      )}
    </div>
  )
}
