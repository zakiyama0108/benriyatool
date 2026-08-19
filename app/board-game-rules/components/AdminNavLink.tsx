'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from '../lib/useSession'
import { isAuthorizedAdmin } from '../../lib/adminAuth'

// 共通ナビ(左サイドバー)に置く、運営者専用の管理画面導線(仕様: admin/requirements.md#ログイン・アクセス制御-18、
// admin/design.md「共通ナビに管理画面への導線を表示する処理」)。
// これは運営者が管理画面へ素早く到達するための利便であって、アクセス制御ではない
// (実際の保護はRLS/Storageポリシーが担う)。判定ロジックは既存の共通運営者判定(isAuthorizedAdmin)を
// そのまま再利用し、新規ロジックは持たない。管理画面自身はBoardGameNavを使わないため、
// 現在地ハイライト(aria-current)は不要
export default function AdminNavLink() {
  const { session } = useSession()
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    // 未ログインでは権限確認自体を行わない(導線を出さない)。authorizedの値はそのままでよい
    // (下の描画側で!sessionを常に優先して判定するため、古いtrueが残っていても表示に影響しない)
    if (!session) return

    let active = true
    isAuthorizedAdmin()
      .then((result) => {
        if (active) setAuthorized(result)
      })
      .catch(() => {
        // 権限確認自体に失敗した場合はフェイルクローズ(導線を出さない。ナビ全体は壊さない)
        if (active) setAuthorized(false)
      })

    return () => {
      active = false
    }
  }, [session])

  if (!session || !authorized) return null

  return (
    // 遷移先は /board-game-rules/admin/ (design.md記載の最終URL)。next.config.tsのtrailingSlash: true設定により、
    // 末尾スラッシュなしのhrefでもNext.js Linkが末尾スラッシュ付きへ自動整形する(BoardGameNavのNAV_ITEMSと同じ書き方)
    <Link
      href="/board-game-rules/admin"
      className="flex items-center gap-3 rounded-lg border-l-4 border-transparent px-3 py-2 text-bgr-subtext transition-colors hover:bg-bgr-bg hover:text-bgr-heading"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="currentColor">
        <path d="M12 2 3 6v6c0 5 3.8 8.7 9 10 5.2-1.3 9-5 9-10V6l-9-4Zm-1 14.6-3.6-3.6 1.4-1.4 2.2 2.2 4.8-4.8 1.4 1.4-6.2 6.2Z" />
      </svg>
      <span className="text-sm">管理画面</span>
    </Link>
  )
}
