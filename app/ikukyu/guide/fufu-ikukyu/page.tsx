import type { Metadata } from 'next'
import Link from 'next/link'
import { HOUSEHOLD_MODEL, comparePatterns, simulateHousehold } from '../lib/householdSimulation'
import { APPLIED_PERIOD_LABEL, GUIDE_ARTICLES, LAST_UPDATED_ISO, LAST_UPDATED_LABEL, PRIMARY_SOURCES } from '../lib/articleMeta'
import ArticleJsonLd from '../components/ArticleJsonLd'
import ArticleSidebar from '../components/ArticleSidebar'
import ArticleTable from '../components/ArticleTable'
import CalloutCard from '../components/CalloutCard'
import FaqSection, { type FaqItem } from '../components/FaqSection'
import GuideBreadcrumb from '../components/GuideBreadcrumb'
import SimulatorCta from '../components/SimulatorCta'
import SourcesFooter from '../components/SourcesFooter'
import StatTiles from '../components/StatTiles'
import { GUIDE_THEMES } from '../lib/theme'

const TITLE = '夫婦で育休を取ると世帯収入はどうなる?パターン別シミュレーション'
const DESCRIPTION =
  'パパが産後パパ育休を28日取ったら世帯の手取りは減る?夫 月給35万円・妻 月給28万円のモデル世帯で、ママのみ育休・パパ28日・パパ14日の3パターンの世帯収入を月次で試算しました。'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: '/ikukyu/guide/fufu-ikukyu',
    type: 'article',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
}

const THEME = 'pink'

const FAQS: FaqItem[] = [
  {
    question: 'パパが育休を取ると、なぜ世帯収入が増えるのですか?',
    answer:
      '出生後休業支援給付金(13%上乗せ)は夫婦それぞれ14日以上の育休取得が要件のため、パパが取らないとママの上乗せも発生しません。パパが14日以上取ると夫婦とも上乗せ対象になり、パパ自身の給付(80%)も就労時の手取りとほぼ同水準のため、世帯では上乗せ分がそのままプラスに働きます。',
  },
  {
    question: 'ボーナスや昇給は考慮されていますか?',
    answer:
      'いいえ。この試算はボーナス(賞与)を除いた月給ベースです。給付額のもとになる賃金日額も休業開始前6か月の賃金(賞与除く)から計算されます。賞与がある場合の世帯影響は勤務先の規定によって変わるため、本記事では扱っていません。',
  },
  {
    question: '表の金額はその月に振り込まれるのですか?',
    answer:
      'いいえ。表は「その月の休業・就労に対応する金額」を発生月ベースで日割り計上したものです。実際の給付金の振込は原則2か月ごとのまとめ払い(後払い)で、初回は育休開始から2〜3か月後になることが一般的です。振込時期の目安はシミュレーターで確認できます。',
  },
]

function yen(amount: number): string {
  return `${amount.toLocaleString()}円`
}

// '2026-10' → '2026年10月'
function monthLabel(month: string): string {
  const [year, m] = month.split('-')
  return `${year}年${Number(m)}月`
}

export default function FufuIkukyuPage() {
  const t = GUIDE_THEMES[THEME]
  // すべての金額はビルド時に計算エンジン(calculator.ts)由来のシミュレーションから導出する
  const patternA = simulateHousehold('A')
  const patternB = simulateHousehold('B')
  const patternC = simulateHousehold('C')
  const { totals, diffFromA } = comparePatterns()

  const relatedArticles = GUIDE_ARTICLES.filter((article) => article.slug !== 'fufu-ikukyu')

  return (
    <div className={`min-h-screen ${t.pageBg}`}>
      <ArticleJsonLd title={TITLE} description={DESCRIPTION} path="/ikukyu/guide/fufu-ikukyu/" dateModified={LAST_UPDATED_ISO} faqs={FAQS} />
      {/* md以上: 左=本文(md:max-w-[720px]) / 右=サイドバー。767px以下は既存の縦1カラムのまま */}
      <div className="mx-auto max-w-md px-4 py-6 md:max-w-6xl md:grid md:grid-cols-[minmax(0,1fr)_288px] md:items-start md:gap-8 md:px-6">
        <article className="space-y-5 md:max-w-[720px]">
          <GuideBreadcrumb />

          <header>
            <h1 className="text-xl font-bold leading-relaxed tracking-tight">{TITLE}</h1>
            <p className="mt-1 text-xs text-gray-500">最終更新: {LAST_UPDATED_LABEL}</p>
          </header>

          <StatTiles
            theme={THEME}
            tiles={[
              { value: `+${Math.round(diffFromA.B / 1000) / 10}万円`, label: 'パパ28日取得時の世帯増減(累計)' },
              { value: '80%', label: 'パパ育休の給付率(上乗せ後)' },
              { value: `${patternA.rows.length}か月`, label: '試算期間(産休開始〜育休終了)' },
            ]}
          />

          {/* リード */}
          <div className="rounded-2xl bg-white p-4 text-sm leading-relaxed shadow-sm space-y-3">
            <p>
              「パパも育休を取りたいけれど、収入が減るのが心配」——夫婦の育休で最も多い悩みです。
              そこでこの記事では、モデル世帯を1つ決めて、パパの取り方別に<strong>世帯収入の月次推移</strong>を実額で試算しました。
            </p>
            <p>
              結論を先に言うと、このモデル世帯では<strong>パパが28日取っても世帯収入は減りません</strong>。
              出生後休業支援給付金(80%給付)と社会保険料免除のおかげで、むしろ累計で
              <strong className={t.accentText}>+{yen(diffFromA.B)}</strong>のプラスになります。
            </p>
          </div>

          {/* 世帯モデルと前提 */}
          <section id="model" className="scroll-mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-base font-bold">世帯モデルと前提</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-gray-700">
              <li>夫: 月給{HOUSEHOLD_MODEL.papaSalary / 10000}万円、妻: 月給{HOUSEHOLD_MODEL.mamaSalary / 10000}万円(いずれも額面。<strong>ボーナスは除外</strong>)</li>
              <li>出産予定日: 2026年10月1日。ママは産前休業(8月21日〜)→出産手当金→育休を2027年9月30日まで取得</li>
              <li>就労している月の収入は<strong>手取り概算(額面の80%)</strong>で計上(社会保険料+税の控除を約2割とみなす)</li>
              <li>給付金は<strong>発生月ベースで日割り</strong>計上。上乗せ分(13%)は対象期間(育休の最初の最大28日)に日割り。実際の振込は2か月ごとの<strong>後払い</strong></li>
              <li>パターンA(ママのみ)では、配偶者の取得要件を満たさないため出生後休業支援給付金の上乗せを計上していません(専業主婦(夫)世帯など要件が免除されるケースを除く)</li>
            </ul>
          </section>

          {/* パターン定義 */}
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-base font-bold">比較する3パターン</h2>
            <ul className="space-y-2 text-sm leading-relaxed">
              <li><span className={`mr-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-extrabold ${t.accentSoftBg}`}>A</span>ママのみ1年育休(パパは就労継続)</li>
              <li><span className={`mr-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-extrabold ${t.accentSoftBg}`}>B</span>ママ1年+パパが出生直後から28日</li>
              <li><span className={`mr-1.5 inline-block rounded-full px-2 py-0.5 text-xs font-extrabold ${t.accentSoftBg}`}>C</span>ママ1年+パパが出生直後から14日(ママは産休のため同時期に休業)</li>
            </ul>
          </section>

          {/* 月次推移表 */}
          <section id="monthly" className="scroll-mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold ${t.accentSoftBg}`}>月次</span>
              世帯収入の月次推移(夫婦合計)
            </h2>
            <ArticleTable
              theme={THEME}
              columns={[
                { header: '月' },
                { header: 'A: ママのみ', align: 'right' },
                { header: 'B: +パパ28日', align: 'right' },
                { header: 'C: +パパ14日', align: 'right' },
              ]}
              rows={patternA.rows.map((row, i) => ({
                cells: [
                  monthLabel(row.month),
                  yen(row.total),
                  <strong key="b" className={t.accentText}>{yen(patternB.rows[i].total)}</strong>,
                  yen(patternC.rows[i].total),
                ],
              }))}
            />
            <p className="mt-2 text-[11px] leading-relaxed text-gray-400">
              ※ 各月の金額は、給付金(発生月ベースで日割り)+就労収入の手取り概算(額面の80%を日割り按分)の夫婦合計です。
            </p>
          </section>

          {/* 差額まとめ */}
          <section id="summary" className="scroll-mt-4 rounded-2xl bg-white p-4 shadow-sm space-y-3">
            <h2 className="text-base font-bold">累計の差額まとめ</h2>
            <ArticleTable
              theme={THEME}
              columns={[
                { header: 'パターン' },
                { header: `世帯収入 累計(${patternA.rows.length}か月)`, align: 'right' },
                { header: 'Aとの差', align: 'right' },
              ]}
              rows={[
                { cells: ['A: ママのみ', yen(totals.A), '—'] },
                { cells: ['B: +パパ28日', <strong key="b" className={t.accentText}>{yen(totals.B)}</strong>, `+${yen(diffFromA.B)}`] },
                { cells: ['C: +パパ14日', yen(totals.C), `+${yen(diffFromA.C)}`] },
              ]}
            />
            <CalloutCard title="ここがポイント">
              パパが28日取得すると、パパ自身の給付(80%)が就労手取りとほぼ同水準なうえ、
              <strong>ママ側にも13%上乗せ(このモデルでは{yen(patternB.bonusTotal.mama)})が発生</strong>するため、
              世帯収入はむしろ増えます。「収入が減るから取れない」は、このモデル世帯では当てはまりません。
            </CalloutCard>
            <p className="text-sm leading-relaxed">
              月給や育休期間が変われば結果も変わります。自分の世帯の条件で、夫婦それぞれの給付額を確かめてみてください。
            </p>
            <SimulatorCta label="自分の世帯の条件で試す →" theme={THEME} />
          </section>

          {/* FAQ */}
          <section id="faq" className="scroll-mt-4 rounded-2xl bg-white p-4 shadow-sm">
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

        <ArticleSidebar
          theme={THEME}
          ctaLabel="自分の世帯の条件で試す →"
          tocItems={[
            { href: '#model', label: '世帯モデルと前提' },
            { href: '#monthly', label: '世帯収入の月次推移' },
            { href: '#summary', label: '累計の差額まとめ' },
            { href: '#faq', label: 'よくある質問' },
          ]}
          relatedArticles={relatedArticles.map((article) => ({ slug: article.slug, title: article.title }))}
          sources={[...PRIMARY_SOURCES]}
          lastUpdated={LAST_UPDATED_LABEL}
        />
      </div>
    </div>
  )
}
