import type { Metadata } from 'next'

// 仕様: article-list/requirements.md#メタ情報-5
const TITLE = '週刊研究発見｜暮らしに影響する研究・論文を週2回お届け'
const DESCRIPTION =
  '医療・栄養・心理・環境・AIなど10ジャンルから、日々の生活に影響の大きい研究の発見・論文を1本ずつ要約してお届け。からだ・くらし編は月曜、科学・社会編は土曜に公開。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/research-digest',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function ResearchDigestLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
