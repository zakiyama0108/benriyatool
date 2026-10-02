'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSession, onAuthChange, signInWithGoogle, signOut } from '../../lib/adminAuth'
import LoginStatus from './LoginStatus'

// 一覧ページ下部のログイン状態表示(仕様: article-list/design.md「画面設計」。付箋一覧への導線)。
// 一覧ページはサーバーコンポーネントのため、セッションの取得・購読はこのクライアントコンポーネントで行う。
// 取得に失敗した場合は未ログインとして扱う
export default function ListLoginStatus() {
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    let active = true
    const load = () =>
      void getSession()
        .then((s) => {
          if (active) setSession(s)
        })
        .catch(() => {
          if (active) setSession(null)
        })
    load()
    const unsubscribe = onAuthChange(load)
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return (
    <footer className="border-t border-gray-100 pt-4">
      <LoginStatus
        session={session}
        onLoginClick={() => void signInWithGoogle(window.location.href)}
        onLogoutClick={() => void signOut()}
      />
    </footer>
  )
}
