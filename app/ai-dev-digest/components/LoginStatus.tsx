'use client'

import type { Session } from '@supabase/supabase-js'
import Link from 'next/link'

type Props = {
  session: Session | null
  onLoginClick: () => void
  onLogoutClick: () => void
}

// ページ下部のログイン状態表示(仕様: article-detail/design.md「画面設計」、
// bookmark/requirements.md#画面共通のログイン導線-16、bookmark/design.md「画面設計」)。
// life-money-simのLoginStatusと同じ表示パターンを踏襲する。ロジックはapp/lib/adminAuth.tsの
// getSession/onAuthChange等をそのまま利用する既存パターンの複製のため、新規のテストは追加しない。
// tasks.md Task11のページ組み立て(カバレッジ計測対象外)に含める。
// 2026-08修正: 付箋機能により読者全員がログインする動機を持つため、ボタン文言から
// 運営者限定を示す表現を外し、ログイン中は付箋一覧ページへのリンクを追加する
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
      <Link href="/ai-dev-digest/bookmarks" className="underline hover:text-teal-600">
        付箋一覧
      </Link>
      <span>{session.user.email}</span>
      <button onClick={onLogoutClick} className="rounded-full border border-gray-200 px-3 py-1">
        ログアウト
      </button>
    </div>
  )
}
