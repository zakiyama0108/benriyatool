import Link from 'next/link'
import { GUIDE_THEMES, type GuideTheme } from '../lib/theme'

type Props = {
  label: string
  theme: GuideTheme
}

// シミュレーター本体への導線。記事の数値を「自分の条件」で確かめてもらうためのCTAボタン
export default function SimulatorCta({ label, theme }: Props) {
  const t = GUIDE_THEMES[theme]
  return (
    <Link
      href="/ikukyu"
      className={`block rounded-full ${t.ctaBg} px-4 py-3 text-center text-sm font-bold text-white shadow-md`}
    >
      {label}
    </Link>
  )
}
