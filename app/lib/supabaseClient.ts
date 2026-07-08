import { createClient } from '@supabase/supabase-js'

// 静的エクスポート(サーバー機能なし)のため、ブラウザから直接この値でSupabaseにアクセスする。
// 書き込み・閲覧の権限はテーブルごとのRLSポリシーで絞る(詳細: docs/adr/0001-user-input-database.md)。
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が設定されていません(.env.local またはビルド環境の環境変数を確認してください)'
  )
}

// 各アプリはこのクライアントを app/<アプリ名>/lib/ のテーブル固有ラッパーから呼び出す
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
