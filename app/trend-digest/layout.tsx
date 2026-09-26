import type { Metadata } from 'next'

// 仕様: requirements.md#メタ情報-1
const TITLE = '週刊トレンド｜様々なジャンルの流行を週2回自動でお届け'
const DESCRIPTION =
  '音楽・映画・グルメ・ファッションなど様々なジャンルの『最近の流行』を週2回自動収集し、日本語でわかりやすく要約してお届け。エンタメ編は火曜、カルチャー・ライフスタイル編は金曜に公開。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/trend-digest',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function TrendDigestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
