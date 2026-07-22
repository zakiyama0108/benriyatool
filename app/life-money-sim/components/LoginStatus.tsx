'use client'

import type { Session } from '@supabase/supabase-js'

type Props = {
  session: Session | null
  onLoginClick: () => void
  onLogoutClick: () => void
}

// ログイン状態の出し分け表示(仕様: user-auth/design.md#ログイン状態を判定して表示を出し分ける処理)
export default function LoginStatus({ session, onLoginClick, onLogoutClick }: Props) {
  if (!session) {
    return (
      <button
        onClick={onLoginClick}
        className="rounded-full bg-lms-teal px-4 py-2 text-sm font-medium text-white"
      >
        Googleでログイン
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 text-sm text-lms-ink/70">
      <span>{session.user.email}</span>
      <button onClick={onLogoutClick} className="rounded-full border border-lms-line px-3 py-1.5">
        ログアウト
      </button>
    </div>
  )
}
