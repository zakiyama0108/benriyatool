'use client'

import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSession, onAuthChange } from '../../lib/adminAuth'

// 各画面がログイン状態を参照するためのフック(仕様: user-auth/design.md「関連するファイル」、tasks.md T1)。
// 初期セッションをgetSessionで取得し、onAuthChangeでログイン完了・ログアウトの変化を購読して更新する。
// 認証ロジックそのものは既存の共通ライブラリ(app/lib/adminAuth.ts)をそのまま利用し、新規実装は持たない。
// loading は初期取得中(セッション未確定)を表す。未ログインとログイン中の暫定的な倒し込みを避けるために使う。
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // アンマウント後に状態更新しないためのガード
    let active = true

    void getSession().then((s) => {
      if (!active) return
      setSession(s)
      setLoading(false)
    })

    // OAuthリダイレクトで戻った際のセッション確立・ログアウトに反応して最新セッションを取り直す
    const unsubscribe = onAuthChange(() => {
      void getSession().then((s) => {
        if (active) setSession(s)
      })
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  return { session, loading }
}
