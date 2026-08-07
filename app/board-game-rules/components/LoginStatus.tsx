'use client'

import Link from 'next/link'
import { useSession } from '../lib/useSession'
import { signInWithGoogle, signOut } from '../../lib/adminAuth'

// アプリ内の各画面の共通ヘッダーに置くログイン導線(仕様: user-auth/requirements.md#ログイン・ログアウト、
// design.md「画面設計」)。useSessionでログイン状態を参照し、未ログイン=ログイン操作のみ、
// ログイン中=アカウント名+お気に入り一覧導線+ログアウト、を出し分ける。
// 許可リスト(admin_emails)による制限はかけない(Googleアカウントを持つ人は誰でもログインできる。
// requirements.md#認証方式-1)。閲覧・絞り込み・新規登録・通報の各導線はログイン状態で出し分けない。
export default function LoginStatus() {
  const { session } = useSession()

  if (!session) {
    // 戻り先は操作元の画面自身のURL(サーバーを介さずブラウザ上でセッションが確立される)
    return (
      <button
        onClick={() => void signInWithGoogle(window.location.href)}
        className="text-xs text-gray-500 underline hover:text-emerald-700"
      >
        Googleでログイン
      </button>
    )
  }

  // アカウント名はGoogle OIDCの表示名を優先し、なければメールアドレスで代替する
  const displayName = (session.user.user_metadata?.full_name as string | undefined) || session.user.email

  return (
    <div className="flex items-center gap-3 text-xs text-gray-500">
      <Link href="/board-game-rules/favorites" className="underline hover:text-emerald-700">
        お気に入り一覧
      </Link>
      <span>{displayName}</span>
      <button onClick={() => void signOut()} className="rounded-full border border-gray-200 px-3 py-1">
        ログアウト
      </button>
    </div>
  )
}
