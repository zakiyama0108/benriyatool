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
// ai-dev-digestのLoginStatus.tsxと同一の実装(リンク先を/news-digest/bookmarksに変更)。
// ボタン文言は運営者限定を示す表現を使わず読者一般を対象とした「ログイン」にする
// (付箋機能により読者全員がログインする動機を持つため)。ログイン中は付箋一覧ページへの
// リンクを追加する
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
      <Link href="/news-digest/bookmarks" className="underline hover:text-teal-600">
        付箋一覧
      </Link>
      <span>{session.user.email}</span>
      <button onClick={onLogoutClick} className="rounded-full border border-gray-200 px-3 py-1">
        ログアウト
      </button>
    </div>
  )
}
