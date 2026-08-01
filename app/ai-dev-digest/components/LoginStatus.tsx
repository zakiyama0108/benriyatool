'use client'

import type { Session } from '@supabase/supabase-js'

type Props = {
  session: Session | null
  onLoginClick: () => void
  onLogoutClick: () => void
}

// ページ下部のログイン状態表示(仕様: design.md「画面設計」。life-money-simのLoginStatusと
// 同じ表示パターンを踏襲する。ロジックはapp/lib/adminAuth.tsのgetSession/onAuthChange等をそのまま
// 利用する既存パターンの複製のため、新規のテストは追加しない。tasks.md Task11のページ組み立て
// (カバレッジ計測対象外)に含める)
export default function LoginStatus({ session, onLoginClick, onLogoutClick }: Props) {
  if (!session) {
    return (
      <button onClick={onLoginClick} className="text-xs text-gray-500 underline">
        運営者ログイン
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <span>{session.user.email}</span>
      <button onClick={onLogoutClick} className="rounded-full border border-gray-300 px-3 py-1">
        ログアウト
      </button>
    </div>
  )
}
