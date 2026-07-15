import { supabase } from '../../../lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'

// 現在のログインセッションを返す。未ログインならnull
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// ログイン状態の変化(ログイン完了・ログアウト)を購読する。戻り値の関数で購読解除する。
// OAuthのリダイレクトで戻ってきた際のセッション確立にも反応する
export function onAuthChange(callback: () => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(() => callback())
  return () => data.subscription.unsubscribe()
}

// Google OIDCでのログインを開始する。認証後は管理画面自身のURLへ戻す
// (静的サイトなのでサーバーを介さず、戻り先ページでセッションが確立される)
export async function signInWithGoogle(redirectTo: string): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
}

// ログアウトしてセッションを破棄する
export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

// ログイン中の本人が閲覧を許可された運営者かを確認する。
// admin_emailsはRLSで「自分のメール行だけ」見えるため、行が返れば許可対象、0件なら対象外。
// 確認自体に失敗した場合は例外を投げ、画面側でエラー表示に切り替えられるようにする
export async function isAuthorizedAdmin(): Promise<boolean> {
  const { data, error } = await supabase.from('admin_emails').select('email')
  if (error) throw new Error(`閲覧権限の確認に失敗しました: ${error.message}`)
  return (data?.length ?? 0) > 0
}
