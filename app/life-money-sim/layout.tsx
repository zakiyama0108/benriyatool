import type { Metadata } from 'next'

// 仕様: specs/life-money-sim/monthly-balance/requirements.md#メタ情報-1
const TITLE = '資産推移シミュレーター｜将来の貯蓄・資産をかんたん試算'
const DESCRIPTION =
  '毎月の収入・支出を入力するだけで、余剰資金と将来の資産推移を月単位で無料シミュレーション。貯蓄のみ/資産運用(複利)の比較にも対応。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/life-money-sim',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

export default function LifeMoneySimLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
