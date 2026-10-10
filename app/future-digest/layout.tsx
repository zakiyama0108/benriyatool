import type { Metadata } from 'next'

// 仕様: article-list/requirements.md#メタ情報-6
const TITLE = '週刊未来予測｜ジャンル別・時間軸別の未来予測を週2回お届け'
const DESCRIPTION =
  'テクノロジー・医療・環境・経済・宇宙など10ジャンルについて、近未来から50年後以降までの未来予測記事を要約してお届け。サイエンス・テクノロジー編は木曜、くらし・社会編は日曜に公開。影響の大きい予測から読めます。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/future-digest',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function FutureDigestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
