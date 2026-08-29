'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSession, onAuthChange, isAuthorizedAdmin, signInWithGoogle, signOut } from '../../lib/adminAuth'
import { fetchPublishedGames } from '../lib/games'
import { fetchReports, type Report } from './lib/fetchReports'
import { fetchGameRequests, markGameRequestProcessed, deleteGameRequest } from './lib/gameRequests'
import { fetchOriginalPhotos } from './lib/photos'
import LoginScreen from './components/LoginScreen'
import ReportsView from './components/ReportsView'
import GameRequestsView from './components/GameRequestsView'
import BoardGameNav from '../components/BoardGameNav'

// 画面の状態。未ログイン/権限なし/権限あり(閲覧可)/認証確認中/認証確認エラー
// (仕様: admin/design.md「状態管理」。ikukyu/admin・life-money-sim/adminと同一方針)
type Phase = 'loading' | 'login' | 'denied' | 'authorized' | 'authError'

// 共通ナビ(左サイドバー)+パンくずの枠(chrome)。権限判定より外側に置き、未ログイン/権限なし/
// 取得エラー/権限ありのどの状態でも同じ枠を保つ(design.md「管理画面を共通chrome(共通ナビ・パンくず)
// で表示し回遊できるようにする処理」)。他画面(favorites/register)と同じ左サイドバー構成に揃える
function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-body flex min-h-screen bg-bgr-bg">
      <BoardGameNav active="admin" />
      <div className="w-full flex-1">
        <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-8">
          <nav aria-label="パンくず" className="flex items-center gap-1 text-xs text-bgr-subtext">
            <Link href="/" className="hover:underline">
              べんりやつーる
            </Link>
            <span>›</span>
            <Link href="/board-game-rules" className="hover:underline">
              ボドゲのトリセツ
            </Link>
            <span>›</span>
            <span className="font-bold text-bgr-heading">管理</span>
          </nav>
          {children}
        </main>
      </div>
    </div>
  )
}

// 管理画面本体(仕様: admin/design.md「画面設計」)。この画面が担うのは複数ゲームを横断する運用
// (通報一覧の確認・登録依頼の確認/処理)とログイン・アクセス制御のみ。ゲーム1件ごとの編集・削除・
// 紹介画像差し替え・元写真照合・コメント削除は詳細画面(game-detail)の管理者導線で行う(adr/0001)。
// 共通ナビ・パンくずは運営者の回遊のための利便であって、アクセス制御ではない(保護はRLSが担う。
// requirements.md#画面レイアウト・回遊導線-15)
export default function AdminPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [email, setEmail] = useState<string | null>(null)

  const [reports, setReports] = useState<Report[]>([])
  const [requests, setRequests] = useState<Awaited<ReturnType<typeof fetchGameRequests>>>([])
  // 通報一覧で対象ゲーム名を表示するための game_id → 名前 の対応(公開ゲーム一覧から作る)
  const [gameNames, setGameNames] = useState<Record<string, string>>({})
  const [dataError, setDataError] = useState(false)
  const [loading, setLoading] = useState(false)
  // 処理済みマーク・削除など各操作の成功後にインクリメントし、下のeffectを再実行して最新化する
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
        const [reportsResult, requestsResult, gamesResult] = await Promise.all([
          fetchReports(),
          fetchGameRequests(),
          fetchPublishedGames(),
        ])
        if (!active) return
        setReports(reportsResult)
        setRequests(requestsResult)
        setGameNames(Object.fromEntries(gamesResult.map((game) => [game.id, game.name])))
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

  async function handleMarkProcessed(id: string) {
    const ok = await markGameRequestProcessed(id)
    if (ok) reload()
  }

  async function handleDeleteRequest(id: string) {
    const ok = await deleteGameRequest(id)
    if (ok) reload()
  }

  if (phase === 'loading') {
    return (
      <AdminShell>
        <p className="py-16 text-center text-sm text-bgr-subtext">読み込み中…</p>
      </AdminShell>
    )
  }

  if (phase === 'login') {
    return (
      <AdminShell>
        <LoginScreen
          variant="login"
          onLogin={() => void signInWithGoogle(`${window.location.origin}/board-game-rules/admin/`)}
          onLogout={() => void signOut()}
        />
      </AdminShell>
    )
  }

  if (phase === 'denied') {
    return (
      <AdminShell>
        <LoginScreen variant="denied" onLogin={() => {}} onLogout={() => void signOut()} />
      </AdminShell>
    )
  }

  if (phase === 'authError') {
    return (
      <AdminShell>
        <div className="space-y-4 rounded-2xl border border-bgr-line bg-bgr-card px-6 py-16 text-center">
          <p className="text-sm text-bgr-subtext">閲覧権限の確認に失敗しました。時間をおいて再度お試しください。</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-bgr-line px-4 py-2 text-sm font-bold text-bgr-heading hover:bg-bgr-bg"
          >
            再試行
          </button>
        </div>
      </AdminShell>
    )
  }

  // phase === 'authorized'
  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-bgr-heading">管理画面</h1>
        <div className="flex items-center gap-3 text-sm text-bgr-subtext">
          {email && <span>{email}</span>}
          <button
            onClick={() => void signOut()}
            className="rounded-lg border border-bgr-line px-3 py-1 text-bgr-heading hover:bg-bgr-bg"
          >
            ログアウト
          </button>
        </div>
      </div>

      {dataError ? (
        <div className="space-y-3 rounded-2xl border border-bgr-line bg-bgr-card py-8 text-center">
          <p className="text-sm text-bgr-subtext">データの取得に失敗しました。</p>
          <button
            onClick={reload}
            className="rounded-lg border border-bgr-line px-4 py-2 text-sm font-bold text-bgr-heading hover:bg-bgr-bg"
          >
            再試行
          </button>
        </div>
      ) : loading ? (
        <p className="py-8 text-center text-sm text-bgr-subtext">読み込み中…</p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold text-bgr-heading">登録依頼</h2>
            <GameRequestsView
              requests={requests}
              onMarkProcessed={handleMarkProcessed}
              onDelete={handleDeleteRequest}
              onViewPhotos={fetchOriginalPhotos}
            />
          </section>

          <section className="space-y-2">
            <h2 className="font-heading text-lg font-bold text-bgr-heading">通報</h2>
            <ReportsView reports={reports} gameNames={gameNames} />
          </section>
        </>
      )}
    </AdminShell>
  )
}
