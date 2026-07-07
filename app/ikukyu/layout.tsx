import type { Metadata } from 'next'

const TITLE = '育休給付金 計算シミュレーター｜いくらもらえる？無料診断'
const DESCRIPTION =
  '育休給付金がいくらもらえるか、無料で計算できるシミュレーターです。出産手当金・育児休業給付金の計算に対応。出産・育児のお金の不安を解消します。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/ikukyu',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function IkukyuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
