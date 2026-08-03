import type { Metadata } from 'next'
import Link from 'next/link'
import { calcMonthlyBenefit } from '../lib/monthlyBenefit'
import { APPLIED_PERIOD_LABEL, GUIDE_ARTICLES, LAST_UPDATED_ISO, LAST_UPDATED_LABEL, PRIMARY_SOURCES } from '../lib/articleMeta'
import ArticleJsonLd from '../components/ArticleJsonLd'
import ArticleSidebar from '../components/ArticleSidebar'
import ArticleTable from '../components/ArticleTable'
import FaqSection, { type FaqItem } from '../components/FaqSection'
import GuideBreadcrumb from '../components/GuideBreadcrumb'
import SimulatorCta from '../components/SimulatorCta'
import SourcesFooter from '../components/SourcesFooter'
import StatTiles from '../components/StatTiles'
import { GUIDE_THEMES } from '../lib/theme'

const TITLE = '月給別・育休給付金早見表(20万〜60万円)|月いくらもらえる?'
const DESCRIPTION =
  '育休給付金が月いくらもらえるか、月給20万〜60万円を5万円刻みで一覧化。最初の180日(67%)・181日以降(50%)・出生後休業支援給付金の上乗せ時(80%)の月額を計算エンジンで算出した早見表です。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/ikukyu/guide/hayamihyo',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const THEME = 'sky'

// 早見表の月給帯: 20万〜60万円を5万円刻み(9段階)
const SALARY_BANDS = [200000, 250000, 300000, 350000, 400000, 450000, 500000, 550000, 600000]

const FAQS: FaqItem[] = [
  {
    question: '表の金額からさらに税金や保険料が引かれますか?',
    answer:
      '引かれません。育休給付金は非課税で、育休中は社会保険料も原則免除されるため、表の金額がほぼそのまま手取りの目安になります。ただし住民税だけは前年の所得に対して課税されるため、育休1年目は前年分の支払いが残る点に注意してください。',
  },
  {
    question: '給付金はいつ振り込まれますか?',
    answer:
      '原則2か月ごとにまとめての後払いで、初回の振込は育休開始から2〜3か月後になることが一般的です。振込時期の目安はシミュレーターでスケジュール付きで確認できます。',
  },
]

function yen(amount: number): string {
  return `${amount.toLocaleString()}円`
}

export default function HayamihyoPage() {
  const t = GUIDE_THEMES[THEME]
  // すべての金額はビルド時に計算エンジン(calculator.ts)から導出する
  const bands = SALARY_BANDS.map((salary) => ({ salary, benefit: calcMonthlyBenefit(salary) }))

  const relatedArticles = GUIDE_ARTICLES.filter((article) => article.slug !== 'hayamihyo')

  return (
    <div className={`min-h-screen ${t.pageBg}`}>
      <ArticleJsonLd title={TITLE} description={DESCRIPTION} path="/ikukyu/guide/hayamihyo/" dateModified={LAST_UPDATED_ISO} faqs={FAQS} />
      {/* md以上: 左=本文(md:max-w-[720px]) / 右=サイドバー。767px以下は既存の縦1カラムのまま */}
      <div className="mx-auto max-w-md px-4 py-6 md:max-w-6xl md:grid md:grid-cols-[minmax(0,1fr)_288px] md:items-start md:gap-8 md:px-6">
        <article className="space-y-5 md:max-w-[720px]">
          <GuideBreadcrumb />

          <header>
            <h1 className="text-xl font-bold leading-relaxed tracking-tight">{TITLE.split('|')[0]}</h1>
            <p className="mt-1 text-xs text-gray-500">最終更新: {LAST_UPDATED_LABEL}</p>
          </header>

          <StatTiles
            theme={THEME}
            tiles={[
              { value: '67%', label: '最初の180日' },
              { value: '50%', label: '181日以降' },
              { value: '80%', label: '支援給付金の上乗せ時' },
            ]}
          />

          {/* リード+冒頭CTA */}
          <div className="rounded-2xl bg-white p-4 text-sm leading-relaxed shadow-sm space-y-3">
            <p>
              育休給付金は「月給のだいたい何割」と言われても、実際に<strong>月いくら</strong>なのかが知りたいところ。
              この早見表では、月給20万〜60万円を5万円刻みで、育休中に受け取れる月額を一覧にしました。
            </p>
            <p>
              金額はすべて当サイトの育休シミュレーターと同じ計算エンジンで算出しています。
              自分の月給に近い行を見たら、正確な金額はシミュレーターでどうぞ。
            </p>
            <SimulatorCta label="自分の月給で正確に計算する →" theme={THEME} />
          </div>

          {/* 目次(月給帯アンカー) */}
          <nav className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-bold tracking-wide text-gray-500">月給帯へジャンプ</p>
            <div className="flex flex-wrap gap-1.5">
              {bands.map(({ salary }) => (
                <a
                  key={salary}
                  href={`#salary-${salary / 10000}`}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.accentSoftBg}`}
                >
                  {salary / 10000}万円
                </a>
              ))}
            </div>
          </nav>

          {/* 早見表(全体) */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold ${t.accentSoftBg}`}>表</span>
              育休給付金 早見表(月額)
            </h2>
            <ArticleTable
              theme={THEME}
              columns={[
                { header: '月給' },
                { header: '最初の180日(67%)', align: 'right' },
                { header: '181日以降(50%)', align: 'right' },
                { header: '上乗せ時(80%)', align: 'right' },
              ]}
              rows={bands.map(({ salary, benefit }) => ({
                cells: [
                  `${salary / 10000}万円`,
                  yen(benefit.month67),
                  yen(benefit.month50),
                  <strong key="m80" className={t.accentText}>{yen(benefit.month80)}</strong>,
                ],
                capped: benefit.capped,
              }))}
            />
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
              ※ 月額は「賃金日額(月給÷30、上限適用後)×給付率×30日」で算出。「上乗せ時(80%)」は出生後休業支援給付金(夫婦それぞれ14日以上の取得等が要件、最大28日間)の適用時です。
            </p>
          </section>

          {/* 手取り感覚の補足 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm space-y-2">
            <h2 className="text-base font-bold">表の金額は「ほぼ手取り」です</h2>
            <p className="text-sm leading-relaxed">
              育休給付金は<strong>非課税</strong>(所得税・住民税がかからない)で、育休中は<strong>社会保険料も原則免除</strong>されます。
              そのため、表の金額がほぼそのまま手取りの目安になります。
            </p>
            <p className="text-sm leading-relaxed">
              ただし<strong>住民税は前年の所得に課税</strong>されるため、育休1年目は前年分の住民税の支払いが残ります(納付書または勤務先経由で納付)。
              ここだけは手取り感覚の誤差になりやすいので注意してください。
            </p>
          </section>

          {/* 月給帯ごとのセクション(将来の記事分割に備えた区切り) */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-base font-bold">月給帯ごとの給付月額</h2>
            <div className="space-y-4">
              {bands.map(({ salary, benefit }) => (
                <div key={salary} id={`salary-${salary / 10000}`} className="scroll-mt-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                  <h3 className="flex items-center gap-2 text-sm font-bold">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-extrabold ${t.accentSoftBg}`}>{salary / 10000}万円</span>
                    月給{salary / 10000}万円の育休給付金
                    {benefit.capped && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">上限適用</span>
                    )}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                    最初の180日は月<strong className={t.accentText}>{yen(benefit.month67)}</strong>、181日以降は月{yen(benefit.month50)}。
                    出生後休業支援給付金の上乗せ期間(最大28日)は月換算で<strong className={t.accentText}>{yen(benefit.month80)}</strong>相当です。
                    {benefit.capped && ' この月給帯は賃金日額の上限にかかるため、給付額は頭打ちになります。'}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <FaqSection faqs={FAQS} theme={THEME} />
          </section>

          {/* 末尾CTA */}
          <SimulatorCta label="自分の月給・育休期間で正確に計算する →" theme={THEME} />

          {/* 関連記事 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-base font-bold">関連記事</h2>
            <ul className="space-y-2 text-sm">
              {relatedArticles.map((article) => (
                <li key={article.slug}>
                  <Link href={`/ikukyu/guide/${article.slug}`} className={`font-semibold ${GUIDE_THEMES[article.theme].accentText} hover:underline`}>
                    {article.title} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <SourcesFooter sources={[...PRIMARY_SOURCES]} lastUpdated={LAST_UPDATED_LABEL} appliedPeriod={APPLIED_PERIOD_LABEL} />
        </article>

        <ArticleSidebar
          theme={THEME}
          ctaLabel="自分の月給・育休期間で正確に計算する →"
          tocItems={bands.map(({ salary }) => ({ href: `#salary-${salary / 10000}`, label: `月給${salary / 10000}万円` }))}
          relatedArticles={relatedArticles.map((article) => ({ slug: article.slug, title: article.title }))}
          sources={[...PRIMARY_SOURCES]}
          lastUpdated={LAST_UPDATED_LABEL}
        />
      </div>
    </div>
  )
}
