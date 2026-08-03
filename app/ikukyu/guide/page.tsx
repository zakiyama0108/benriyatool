import type { Metadata } from 'next'
import Link from 'next/link'
import { GUIDE_ARTICLES } from './lib/articleMeta'
import ArticleSidebar from './components/ArticleSidebar'
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
      {/* md以上: 左=記事一覧(2列グリッド) / 右=サイドバー。767px以下は既存の縦1カラムのまま */}
      <div className="mx-auto max-w-md px-4 py-6 md:max-w-6xl md:grid md:grid-cols-[minmax(0,1fr)_288px] md:items-start md:gap-8 md:px-6">
        <div className="space-y-5">
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

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
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

        <ArticleSidebar
          theme="mint"
          ctaLabel="シミュレーターで自分の給付額を計算する →"
          about={{
            title: 'このガイドについて',
            description:
              '育休中のお金にまつわる疑問を、制度の説明だけで終わらせずに「月給いくらならいくら受け取れるか」の実額まで落として解説しています。掲載している金額はすべて、当サイトの育休シミュレーターと同じ計算エンジンで算出したものです。',
          }}
        />
      </div>
    </div>
  )
}
