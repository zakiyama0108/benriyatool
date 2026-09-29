'use client'

import type { Session } from '@supabase/supabase-js'

type Props = {
  session: Session | null
  onLoginClick: () => void
  onLogoutClick: () => void
}

// ページ下部のログイン状態表示(仕様: article-detail/design.md「画面設計」)。
// 付箋一覧へのリンクはbookmarkの実装時に追加する
export default function LoginStatus({ session, onLoginClick, onLogoutClick }: Props) {
  if (!session) {
    return (
      <button onClick={onLoginClick} className="text-xs text-gray-400 underline hover:text-teal-600">
        ログイン
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 text-xs text-gray-400">
      <span>{session.user.email}</span>
      <button onClick={onLogoutClick} className="rounded-full border border-gray-200 px-3 py-1">
        ログアウト
      </button>
    </div>
  )
}
