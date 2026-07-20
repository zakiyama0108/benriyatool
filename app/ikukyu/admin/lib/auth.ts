// admin_emails許可リストに依存する認証ロジックは、life-money-sim/adminと共用するため
// app/lib/adminAuth.tsへ切り出した(仕様: specs/life-money-sim/admin/tasks.md T1)。
// このファイルは既存の呼び出し元・テストの互換性のために re-export のみ行う
export { getSession, onAuthChange, signInWithGoogle, signOut, isAuthorizedAdmin } from '../../../lib/adminAuth'
