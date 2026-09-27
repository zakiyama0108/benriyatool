'use client'

import type { Session } from '@supabase/supabase-js'

type Props = {
  session: Session | null
  onLoginClick: () => void
  onLogoutClick: () => void
}

// ページ下部のログイン状態表示(仕様: article-detail/design.md「画面設計」)。
// trend-digest/components/LoginStatus.tsxと同じ表示パターンを踏襲する。付箋一覧リンクは
// bookmark spec実装時に追加する(design.md「関連するファイル(抜粋)」ではbookmark実装後に
// このコンポーネントへ追記する想定のため、未実装のページへのリンクは今回は張らない)。
// ロジックはapp/lib/adminAuth.tsのgetSession/onAuthChange等をそのまま利用する既存パターンの
// 複製のため、新規のテストは追加しない(tasks.md Task12のページ組み立て、カバレッジ計測対象外)
export default function LoginStatus({ session, onLoginClick, onLogoutClick }: Props) {
  if (!session) {
    return (
      <button onClick={onLoginClick} className="text-xs text-gray-400 underline hover:text-indigo-600">
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
