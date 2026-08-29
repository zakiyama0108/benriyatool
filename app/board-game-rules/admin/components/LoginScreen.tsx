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
    <div className="mx-auto max-w-sm space-y-4 rounded-2xl border border-bgr-line bg-bgr-card px-4 py-16 text-center">
      <h1 className="font-heading text-xl font-bold text-bgr-heading">ボードゲームのルール解説 管理画面</h1>
      {variant === 'login' ? (
        <>
          <p className="text-sm text-bgr-subtext">閲覧するにはログインが必要です。</p>
          <button
            onClick={onLogin}
            className="w-full rounded-lg bg-bgr-primary py-2.5 text-sm font-bold text-white transition-colors hover:bg-bgr-primary-active"
          >
            Googleでログイン
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-bgr-subtext">このアカウントには閲覧する権限がありません。</p>
          <button
            onClick={onLogout}
            className="w-full rounded-lg border border-bgr-line py-2.5 text-sm font-bold text-bgr-heading hover:bg-bgr-bg"
          >
            ログアウト
          </button>
        </>
      )}
    </div>
  )
}
