import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDE_ARTICLES } from './lib/articleMeta'
import SimulatorCta from './components/SimulatorCta'
import { GUIDE_THEMES } from './lib/theme'

const TITLE = '育休給付金ガイド|計算エンジンで検証した実額つき解説記事'
const DESCRIPTION =
  '育休給付金シミュレーターの計算エンジンで算出した実額つきの解説記事一覧。手取り10割の検証、月給別早見表、夫婦育休の世帯収入シミュレーションなど。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/ikukyu/guide',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

// 記事一覧ページ。3記事へのカードリンクを置き、今後の記事追加の受け皿にする
// (記事本文と同じカードUI。一覧のみの薄いページのため構造化データは付けない)
export default function GuideIndexPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-sky-50/40 to-white">
      <div className="mx-auto max-w-md space-y-5 px-4 py-6">
        <nav className="text-[11px] text-gray-400">
          <Link href="/" className="hover:underline">べんりやつーる</Link>
          <span className="mx-1">›</span>
          <Link href="/ikukyu" className="hover:underline">育休シミュレーター</Link>
          <span className="mx-1">›</span>
          <span>ガイド</span>
        </nav>

        <header>
          <h1 className="text-xl font-bold tracking-tight">育休給付金ガイド</h1>
          <p className="mt-1 text-sm leading-relaxed text-gray-500">
            シミュレーターと同じ計算エンジンで算出した「実額」つきの解説記事です。制度の一般論ではなく、具体的な金額で確かめられます。
          </p>
        </header>

        <div className="space-y-3">
          {GUIDE_ARTICLES.map((article) => {
            const t = GUIDE_THEMES[article.theme]
            return (
              <Link
                key={article.slug}
                href={`/ikukyu/guide/${article.slug}`}
                className="block rounded-2xl bg-white p-4 shadow-sm"
              >
                <p className={`text-sm font-bold leading-relaxed ${t.accentText}`}>{article.title} →</p>
                <p className="mt-1 text-xs leading-relaxed text-gray-500">{article.summary}</p>
              </Link>
            )
          })}
        </div>

        <SimulatorCta label="シミュレーターで自分の給付額を計算する →" theme="mint" />
      </div>
    </div>
  )
}
