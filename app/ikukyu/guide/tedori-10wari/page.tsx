import type { Metadata } from 'next'
import Link from 'next/link'
import { calcMonthlyBenefit, estimateWorkingNetIncome, findCapSalaryLine } from '../lib/monthlyBenefit'
import { APPLIED_PERIOD_LABEL, GUIDE_ARTICLES, LAST_UPDATED_ISO, LAST_UPDATED_LABEL, PRIMARY_SOURCES } from '../lib/articleMeta'
import ArticleJsonLd from '../components/ArticleJsonLd'
import ArticleTable from '../components/ArticleTable'
import CalloutCard from '../components/CalloutCard'
import FaqSection, { type FaqItem } from '../components/FaqSection'
import GuideBreadcrumb from '../components/GuideBreadcrumb'
import SimulatorCta from '../components/SimulatorCta'
import SourcesFooter from '../components/SourcesFooter'
import StatTiles from '../components/StatTiles'
import { GUIDE_THEMES } from '../lib/theme'

const TITLE = '【2026年版】育休の手取り10割は本当?月給別に実額を検証'
const DESCRIPTION =
  '出生後休業支援給付金でいくら増える?月給20万〜50万円の5ケースで、通常の育休給付67%と上乗せ後80%の実額を計算エンジンで検証。手取り10割にならない月給ラインも明示します。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/ikukyu/guide/tedori-10wari',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const THEME = 'mint'

const FAQS: FaqItem[] = [
  {
    question: 'パパが14日だけ取得した場合も上乗せの対象になりますか?',
    answer:
      'はい。夫婦それぞれが14日以上の育休を取得していれば要件を満たし、それぞれの育休の最初の最大28日分が13%上乗せの対象になります。なお、配偶者が専業主婦(夫)の場合など、配偶者側の取得要件が免除されるケースもあります。',
  },
  {
    question: '上乗せ分は別途申請が必要ですか?',
    answer:
      '出生時育児休業給付金・育児休業給付金と併せてハローワークに申請します。多くの場合、勤務先経由での手続きになるため、育休前に勤務先の担当部署に確認しておくとスムーズです。',
  },
  {
    question: 'ボーナスがある場合はどう考えればいいですか?',
    answer:
      '給付額のもとになる賃金日額は、休業開始前6か月の賃金(賞与を除く)から計算されます。本記事の「月給」も賞与を除いた総支給額(額面)で読み替えてください。',
  },
]

// 記事に載せる月給5ケース(額面)
const CASE_SALARIES = [200000, 250000, 300000, 400000, 500000]

// 金額の表示形式(3桁区切り+円)
function yen(amount: number): string {
  return `${amount.toLocaleString()}円`
}

// 「手取り(概算)との差」の表示。プラス・マイナスを明示する
function diffLabel(amount: number): string {
  if (amount === 0) return '±0円'
  return amount > 0 ? `+${yen(amount)}` : `-${yen(-amount)}`
}

export default function TedoriTenWariPage() {
  const t = GUIDE_THEMES[THEME]
  // すべての金額はビルド時に計算エンジン(calculator.ts)から導出する
  const cases = CASE_SALARIES.map((salary) => {
    const benefit = calcMonthlyBenefit(salary)
    const workingNet = estimateWorkingNetIncome(salary)
    return { salary, benefit, workingNet, diff: benefit.month80 - workingNet }
  })
  const { capSalary, cappedDailyWage } = findCapSalaryLine()

  const relatedArticles = GUIDE_ARTICLES.filter((article) => article.slug !== 'tedori-10wari')

  return (
    <div className={`min-h-screen ${t.pageBg}`}>
      <ArticleJsonLd title={TITLE} description={DESCRIPTION} path="/ikukyu/guide/tedori-10wari/" dateModified={LAST_UPDATED_ISO} faqs={FAQS} />
      <article className="mx-auto max-w-md space-y-5 px-4 py-6">
        <GuideBreadcrumb />

        {/* タイトル+更新日 */}
        <header>
          <h1 className="text-xl font-bold leading-relaxed tracking-tight">{TITLE}</h1>
          <p className="mt-1 text-xs text-gray-500">最終更新: {LAST_UPDATED_LABEL}</p>
        </header>

        {/* 要点スタットタイル */}
        <StatTiles
          theme={THEME}
          tiles={[
            { value: '80%', label: '上乗せ後の給付率' },
            { value: '28日', label: '上乗せの最大日数' },
            { value: '14日+', label: '夫婦それぞれの取得条件' },
          ]}
        />

        {/* リード: 制度の要点(3〜4段落のみ) */}
        <div className="rounded-2xl bg-white p-4 text-sm leading-relaxed shadow-sm space-y-3">
          <p>
            2025年4月に始まった<strong>「出生後休業支援給付金」</strong>は、育休中の給付を大きく引き上げる制度です。
            「育休中も手取り10割」という言葉を目にして、本当なのか気になっている方も多いのではないでしょうか。
          </p>
          <p>
            仕組みはシンプルで、<strong>夫婦それぞれが14日以上</strong>の育休を取得すると、通常67%の育休給付に
            <strong>13%が上乗せされて80%</strong>になります。上乗せの対象は育休の最初の<strong>最大28日間</strong>です。
          </p>
          <p>
            給付金は非課税で、育休中は社会保険料も原則免除されます。働いているときの手取りが
            <strong>額面の約8割</strong>であることを踏まえると、「給付80% ≒ ふだんの手取り」となり、これが「手取り10割」と言われる根拠です。
          </p>
          <p>
            ただし、給付のもとになる賃金日額には上限があるため、<strong>すべての月給で10割になるわけではありません</strong>。
            この記事では、当サイトの育休シミュレーターと同じ計算エンジンで、月給別の実額を検証します。
          </p>
        </div>

        {/* 実額検証テーブル */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold ${t.accentSoftBg}`}>80%</span>
            月給別・実額検証(1か月あたり)
          </h2>
          <ArticleTable
            theme={THEME}
            columns={[
              { header: '月給(額面)' },
              { header: '通常の給付(67%)', align: 'right' },
              { header: '上乗せ後(80%)', align: 'right' },
              { header: '手取り(概算)との差', align: 'right' },
            ]}
            rows={cases.map(({ salary, benefit, diff }) => ({
              cells: [
                `${salary / 10000}万円`,
                yen(benefit.month67),
                <strong key="m80" className={t.accentText}>{yen(benefit.month80)}</strong>,
                diffLabel(diff),
              ],
              capped: benefit.capped,
            }))}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
            ※ 月額は「賃金日額(月給÷30、上限適用後)×給付率×30日」で算出。「手取り(概算)」は社会保険料+税の控除を約2割とみなした額面の8割の概算です。
          </p>
          <div className="mt-3">
            <SimulatorCta label="あなたの条件で正確に計算する →" theme={THEME} />
          </div>
        </section>

        {/* 上限ライン(この記事の独自価値) */}
        <section className="rounded-2xl bg-white p-4 shadow-sm space-y-3">
          <h2 className="text-base font-bold">手取り10割にならない月給ライン</h2>
          <p className="text-sm leading-relaxed">
            上の表のとおり、月給40万円までは「上乗せ後の給付」と「ふだんの手取り(概算)」の差はごくわずかで、
            手取り10割はほぼ実現します。一方で月給50万円では差が開きます。
          </p>
          <CalloutCard title="ここがポイント">
            境目は<strong>月給{capSalary.toLocaleString()}円</strong>。これ以上の月給では賃金日額の上限
            ({cappedDailyWage.toLocaleString()}円)が適用されて給付額が頭打ちになり、月給が上がるほど
            「手取り10割」から遠ざかります。
          </CalloutCard>
          <p className="text-sm leading-relaxed">
            自分の月給が上限にかかるかどうかは、シミュレーターに月給を入れるだけで確認できます(上限適用時は画面に表示されます)。
          </p>
          <SimulatorCta label="あなたの条件で正確に計算する →" theme={THEME} />
        </section>

        {/* FAQ */}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <FaqSection faqs={FAQS} theme={THEME} />
        </section>

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
    </div>
  )
}
