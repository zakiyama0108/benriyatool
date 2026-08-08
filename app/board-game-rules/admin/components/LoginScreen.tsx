'use client'

type Props = {
  // login: 未ログイン(ログインを促す) / denied: ログイン済みだが閲覧権限なし
  variant: 'login' | 'denied'
  onLogin: () => void
  onLogout: () => void
}

// 未ログイン・権限なしのときの案内画面。データは一切表示しない
// (仕様: requirements.md#ログイン・アクセス制御-1、requirements.md#ログイン・アクセス制御-3。
// ikukyu/admin/components/LoginScreen.tsxと同等のロジック)
export default function LoginScreen({ variant, onLogin, onLogout }: Props) {
  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center space-y-4">
      <h1 className="text-xl font-bold">ボードゲームのルール解説 管理画面</h1>
      {variant === 'login' ? (
        <>
          <p className="text-sm text-gray-500">閲覧するにはログインが必要です。</p>
          <button
            onClick={onLogin}
            className="w-full rounded-lg bg-gray-900 py-2.5 text-sm font-medium text-white"
          >
            Googleでログイン
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-700">このアカウントには閲覧する権限がありません。</p>
          <button
            onClick={onLogout}
            className="w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700"
          >
            ログアウト
          </button>
        </>
      )}
    </div>
  )
}
