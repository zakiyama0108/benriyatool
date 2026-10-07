'use client'

import { useEffect, useState } from 'react'
import { getSession, onAuthChange, signInWithGoogle, signOut, isAuthorizedAdmin } from '../../../lib/adminAuth'
import { buildSourceDirectory } from '../../lib/buildSourceDirectory'
import type { WatchlistEntry, Criteria } from '../../lib/watchlistTypes'
import watchlistData from '../../../../content/trend-digest/watchlist.json'
import criteriaData from '../../../../content/trend-digest/criteria.json'
import SourceTable from './components/SourceTable'

// 情報源一覧(運営者専用)ページ(仕様: design.md「表示する行を組み立てる処理」「ログイン状態に
// 応じて表示を切り替える処理」)。watchlist.json・criteria.jsonをビルド時に読み込んで表示行を
// 組み立てる(実行時にファイルを読み直したり、APIへ問い合わせたりはしない。requirements.md#
// 機能要件-5)。ジャンル定義の妥当性は__tests__/trend-digest/lib/watchlistData.test.tsが担うため、
// ここではbuildSourceDirectory自体が持つ最小限のガード(未定義ジャンルなどは例外)に委ねる
const watchlist = watchlistData.genres as WatchlistEntry[]
const criteria = criteriaData as Criteria
const rows = buildSourceDirectory(watchlist, criteria)

// 画面の状態。確認中 / 未ログイン / 権限なし / 権限あり(閲覧可) / 確認自体の失敗
type Phase = 'loading' | 'login' | 'denied' | 'authorized' | 'authError'

export default function SourceDirectoryPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [email, setEmail] = useState<string | null>(null)

  // ログイン状態と閲覧権限を判定する。ログイン完了・ログアウトのたびに再実行する
  // (design.md「ログイン状態に応じて表示を切り替える処理」手順1〜5)
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
      } catch (e) {
        if (active) setPhase('authError')
        // eslint-disable-next-line no-console -- 原因究明用。画面には「確認できませんでした」とだけ伝える
        console.error('情報源一覧: 閲覧権限の確認に失敗しました', e)
      }
    }
    void checkAuth()
    const unsubscribe = onAuthChange(() => void checkAuth())
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  if (phase === 'loading') {
    return <p className="px-4 py-16 text-center text-sm text-gray-400">読み込み中…</p>
  }

  if (phase === 'login') {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-bold">情報源一覧</h1>
        <p className="text-sm text-gray-500">閲覧するにはログインが必要です。</p>
        <button
          onClick={() => void signInWithGoogle(window.location.href)}
          className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white"
        >
          Googleでログイン
        </button>
      </div>
    )
  }

  if (phase === 'denied') {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center space-y-4">
        <p className="text-sm text-gray-700">このアカウントには閲覧する権限がありません。</p>
        <button
          onClick={() => void signOut()}
          className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700"
        >
          ログアウト
        </button>
      </div>
    )
  }

  if (phase === 'authError') {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center space-y-4">
        <p className="text-sm text-gray-700">閲覧権限を確認できませんでした。時間をおいて再度お試しください。</p>
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
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">情報源一覧</h1>
          <p className="mt-1 text-xs text-gray-500">
            このページは表示専用です。変更は月次見直しのPRで行ってください。
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          {email && <span>{email}</span>}
          <button onClick={() => void signOut()} className="rounded border border-gray-300 px-3 py-1">
            ログアウト
          </button>
        </div>
      </div>

      <SourceTable rows={rows} />
    </div>
  )
}
