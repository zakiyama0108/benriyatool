'use client'

import { useEffect, useState } from 'react'
import type { AdminRecord, Filter } from './lib/types'
import { DEFAULT_FILTER } from './lib/types'
import { getSession, signInWithGoogle, signOut, isAuthorizedAdmin, onAuthChange } from './lib/auth'
import { fetchResults } from './lib/fetchResults'
import { buildSummary } from './lib/aggregate'
import LoginScreen from './components/LoginScreen'
import FilterBar from './components/FilterBar'
import SummaryStats from './components/SummaryStats'
import ResultsTable from './components/ResultsTable'

// 画面の状態。未ログイン / 権限なし / 権限あり(閲覧可) / 認証確認中 / 認証確認エラー
type Phase = 'loading' | 'login' | 'denied' | 'authorized' | 'authError'

export default function AdminPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>(DEFAULT_FILTER)
  const [records, setRecords] = useState<AdminRecord[]>([])
  const [dataError, setDataError] = useState(false)
  const [loading, setLoading] = useState(false)

  // ログイン状態と閲覧権限を判定する。OAuthリダイレクトで戻ってきたときやログアウト時にも呼ばれる
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

  // 権限ありのとき、絞り込み条件に一致するレコードを取得する。条件が変わるたびに取得し直す
  useEffect(() => {
    if (phase !== 'authorized') return
    let active = true
    async function load() {
      setLoading(true)
      setDataError(false)
      try {
        const rows = await fetchResults(filter)
        if (active) setRecords(rows)
      } catch (e) {
        if (!active) return
        // 管理画面は運営者自身が使うため、失敗を握りつぶさずエラー表示にする(design.md#ログ)
        // eslint-disable-next-line no-console -- 利用者=運営者自身が開発者ツールで原因を確認できるため出力する
        console.error('管理画面: 保存データの取得に失敗しました', e)
        setDataError(true)
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [phase, filter])

  if (phase === 'loading') {
    return <p className="px-4 py-16 text-center text-sm text-gray-400">読み込み中…</p>
  }

  if (phase === 'login') {
    return (
      <LoginScreen
        variant="login"
        onLogin={() => void signInWithGoogle(`${window.location.origin}/ikukyu/admin/`)}
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
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
        >
          再試行
        </button>
      </div>
    )
  }

  // phase === 'authorized'
  const summary = buildSummary(records, filter)
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">管理画面</h1>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {email && <span>{email}</span>}
          <button onClick={() => void signOut()} className="rounded border border-gray-300 px-3 py-1">
            ログアウト
          </button>
        </div>
      </div>

      <FilterBar filter={filter} onChange={setFilter} />

      {dataError ? (
        <div className="space-y-3 py-8 text-center">
          <p className="text-sm text-gray-700">データの取得に失敗しました。</p>
          <button
            onClick={() => setFilter({ ...filter })}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700"
          >
            再試行
          </button>
        </div>
      ) : loading ? (
        <p className="py-8 text-center text-sm text-gray-400">読み込み中…</p>
      ) : (
        <>
          <SummaryStats summary={summary} />
          <ResultsTable records={records} />
        </>
      )}
    </div>
  )
}
