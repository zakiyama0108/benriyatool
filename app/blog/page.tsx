import type { Metadata } from 'next'
import Link from 'next/link'
import { DIGEST_APPS } from './lib/digestApps'
import DigestAppCard from './components/DigestAppCard'

// 仕様: requirements.md#メタ情報-1
export const metadata: Metadata = {
  title: '週刊ダイジェスト一覧｜べんりやつーる',
  description:
    'AI駆動開発・ニュース・トレンド・未来予測・研究発見の5つのダイジェストアプリへの入口を、配信曜日付きでまとめています。',
}

// ブログダイジェストハブページ(仕様: requirements.md#ダイジェストカード一覧、design.md「ダイジェスト
// カード一覧を表示する処理」)。DIGEST_APPSの記載順そのままに5カードを並べ、最後に情報源一覧ページ
// (運営者専用)への導線リンクを1つだけ置く(requirements.md#情報源一覧への導線-1)
export default function BlogHubPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 space-y-10">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">週刊ダイジェスト一覧</h1>
        <p className="text-sm text-gray-500">配信曜日を見て、読みたいダイジェストを選べます</p>
      </div>

      <div className="space-y-4">
        {DIGEST_APPS.map((app) => (
          <DigestAppCard
            key={app.id}
            name={app.name}
            description={app.description}
            scheduleLabel={app.scheduleLabel}
            icon={app.icon}
            href={app.href}
          />
        ))}
      </div>

      {/* 仕様: requirements.md#情報源一覧への導線-1〜2。本ページでは権限チェックを行わず、
          未ログインの訪問者は情報源一覧ページ側の仕組みでログインが促される */}
      <div className="text-center">
        <Link href="/blog/admin/sources" className="text-sm font-bold text-gray-500 hover:text-orange-500 hover:underline">
          情報源一覧(運営者専用)を見る →
        </Link>
      </div>
    </div>
  )
}
