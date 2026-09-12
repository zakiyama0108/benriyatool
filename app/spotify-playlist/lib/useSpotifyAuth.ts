'use client'

import { useCallback, useEffect, useState } from 'react'
import { initializeSession, prepareAuthorization, clearTokens, type AuthState } from './spotifyAuth'

// 画面がSpotifyのログイン状態を参照するためのフック(design.md#状態管理)。
// マウント直後は「判定中(checking)」で始まり、初期化処理(design.md#ログイン状態を復元する処理)の
// 完了後に「未ログイン」または「ログイン中」へ切り替わる。
export function useSpotifyAuth() {
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' })

  useEffect(() => {
    let active = true
    void initializeSession().then((next) => {
      if (active) setAuth(next)
    })
    return () => {
      active = false
    }
  }, [])

  // 認可画面へ遷移する。PKCE用の値の生成・一時保存はprepareAuthorizationが行う。
  const login = useCallback(async () => {
    const url = await prepareAuthorization()
    window.location.assign(url)
  }, [])

  // ログアウト、およびセッション失効時の未ログインへの切り替え(保存情報のみ破棄、design.md#ログアウトする処理)。
  const clearSession = useCallback(() => {
    clearTokens()
    setAuth({ status: 'loggedOut' })
  }, [])

  return { auth, login, clearSession }
}
