import Link from 'next/link'

type Props = {
  name: string
  description: string
  scheduleLabel: string
  icon: string
  href: string
}

// 1アプリ分のカード(仕様: design.md#コンポーネント設計)。トップページの既存ツールカード
// (app/page.tsx)と同じクラス構成で、カード全体をクリックするとhref(そのアプリのトップページ)
// へ遷移する(requirements.md#ダイジェストカード一覧-2)
export default function DigestAppCard({ name, description, scheduleLabel, icon, href }: Props) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-gray-200 bg-white p-6 hover:border-orange-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className="text-base font-bold text-gray-900">{name}</h2>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
          <p className="mt-2 text-xs font-medium text-orange-500">配信: {scheduleLabel}</p>
        </div>
      </div>
    </Link>
  )
}
