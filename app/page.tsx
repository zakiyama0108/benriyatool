import type { Metadata } from 'next'
import Link from 'next/link'
import WebSiteJsonLd from './components/WebSiteJsonLd'

export const metadata: Metadata = {
  title: 'べんりやつーる | 暮らしのお金・手続きに役立つ無料ツール集',
  description: '暮らしのお金や手続きに関する無料ツールを提供しています。育休給付金シミュレーターをはじめ、今後も便利なツールを追加していきます。',
}

export default function HubPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 space-y-10">
      {/* Google検索のサイト名対応(WebSite構造化データ) */}
      <WebSiteJsonLd />

      {/* ヘッダー */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">べんりやつーる</h1>
        <p className="text-sm text-gray-500">暮らしのお金・手続きに役立つ無料ツール集</p>
      </div>

      {/* ツールカード一覧 */}
      <div className="space-y-4">
        <Link
          href="/ikukyu"
          className="block rounded-2xl border border-gray-200 bg-white p-6 hover:border-orange-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">🧮</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">育休給付金シミュレーター</h2>
              <p className="mt-1 text-sm text-gray-500">
                産後から育休まで、もらえる給付金が全部わかる
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/life-money-sim"
          className="block rounded-2xl border border-gray-200 bg-white p-6 hover:border-orange-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">📈</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">資産推移シミュレーター</h2>
              <p className="mt-1 text-sm text-gray-500">
                毎月の収支から、将来の資産推移を見通す
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/ai-dev-digest"
          className="block rounded-2xl border border-gray-200 bg-white p-6 hover:border-orange-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">🤖</span>
            <div>
              <h2 className="text-base font-bold text-gray-900">AI駆動開発ダイジェスト</h2>
              <p className="mt-1 text-sm text-gray-500">
                AI駆動開発関連の話題を1日1回まとめてお届け
              </p>
            </div>
          </div>
        </Link>
      </div>

      {/* 関連記事(ツールではないためカードとは表示を区別する) */}
      <div className="text-center">
        <Link href="/ikukyu/guide" className="text-sm font-bold text-gray-500 hover:text-orange-500 hover:underline">
          育休給付金ガイド記事を読む →
        </Link>
      </div>
    </div>
  )
}
