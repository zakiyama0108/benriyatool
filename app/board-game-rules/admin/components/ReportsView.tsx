'use client'

import type { Report } from '../lib/fetchReports'
import type { AdminGame } from '../lib/fetchAdminGames'

type Props = {
  reports: Report[]
  games: AdminGame[]
  onSelectGame: (gameId: string) => void
}

// 通報一覧。各通報に対象ゲーム・通報日時・理由テキストを表示し、対象ゲームの編集・削除へ導く
// (仕様: admin/requirements.md#通報の確認-8、#通報の確認-9)。通報者・第三者は自分の通報も
// 含めて読めない(SELECT権限なし)ため、ここに出るのは運営者だけが見る内容
export default function ReportsView({ reports, games, onSelectGame }: Props) {
  if (reports.length === 0) {
    return <p className="py-4 text-center text-sm text-gray-400">通報はありません。</p>
  }

  return (
    <ul className="space-y-2">
      {reports.map((report) => {
        const gameName = games.find((g) => g.id === report.gameId)?.name ?? report.gameId
        return (
          <li key={report.id} className="rounded-lg border border-gray-200 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{gameName}</span>
              <span className="text-xs text-gray-400">{report.createdAt}</span>
            </div>
            <p className="mt-1 text-gray-700">{report.reason || '理由の記載なし'}</p>
            <button
              type="button"
              onClick={() => onSelectGame(report.gameId)}
              className="mt-2 rounded border border-gray-300 px-3 py-1 text-xs"
            >
              対象ゲームを編集する
            </button>
          </li>
        )
      })}
    </ul>
  )
}
