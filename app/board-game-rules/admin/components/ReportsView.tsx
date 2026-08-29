'use client'

import Link from 'next/link'
import type { Report } from '../lib/fetchReports'

type Props = {
  reports: Report[]
  // game_id → ゲーム名の対応(親が公開ゲーム一覧から作って渡す)。削除済み等で名前が引けない場合は
  // フォールバック表示にする
  gameNames: Record<string, string>
}

// 通報一覧。各通報に対象ゲーム・通報日時・理由テキストを表示し、対象ゲームの詳細画面(game-detail)へ
// 遷移するリンクを出す(仕様: admin/requirements.md#通報の確認-6、#通報の確認-7)。編集・削除は遷移先の
// 詳細画面の管理者導線で行う。通報者・第三者は自分の通報も含め読めない(SELECT権限なし)ため、
// ここに出るのは運営者だけが見る内容。理由テキストはHTMLとして解釈しない形で描画する(design.md#セキュリティ)。
export default function ReportsView({ reports, gameNames }: Props) {
  if (reports.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">通報はありません。</p>
  }

  return (
    <ul className="space-y-2">
      {reports.map((report) => {
        const gameName = gameNames[report.gameId] ?? '(削除された、または取得できないゲーム)'
        return (
          <li key={report.id} className="rounded-lg border border-gray-200 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{gameName}</span>
              <span className="text-xs text-gray-400">{report.createdAt}</span>
            </div>
            <p className="mt-1 text-gray-700">{report.reason || '理由の記載なし'}</p>
            <Link
              href={`/board-game-rules/detail?id=${report.gameId}`}
              className="mt-2 inline-block rounded border border-gray-300 px-3 py-1 text-xs"
            >
              対象ゲームの詳細を開く
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
