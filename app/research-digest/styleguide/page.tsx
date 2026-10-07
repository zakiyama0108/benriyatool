'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { GenreEntry, SortOrder } from '../lib/sortGenres'
import type { Article, Finding } from '../lib/types'
import FindingBadges from '../components/FindingBadges'
import ArticleCard from '../components/ArticleCard'
import FindingCard from '../components/FindingCard'
import SortToggle from '../components/SortToggle'
import Pagination from '../components/Pagination'
import BookmarkPanel from '../components/BookmarkPanel'
import LoginStatus from '../components/LoginStatus'

// 週刊研究発見(research-digest)の共通部品カタログ(styleguide)。開発者向け確認用ページで、
// 利用者向けの公開機能ではない(sitemap除外: specs/hub-site/requirements.md#機能要件-5)。
// article-detail・article-list・bookmarkと共通のTailwindユーティリティ(ティール系)を
// そのまま使う設計のため、実際に使っている配色クラスと共通部品をそのまま並べて写す
// (仕様: article-detail/design.md「画面設計」。Step0は実施しない方針)。
// フォルダ名にアンダースコアは付けない(_styleguideはNext.jsのprivate folderで生きたURLに
// 遷移できないため。styleguide.pngキャプチャのため生きたURLが必要)

const COLOR_SWATCHES: { name: string; swatch: string; use: string }[] = [
  { name: 'teal-50 → slate-50/40 → white', swatch: 'bg-gradient-to-b from-teal-50 via-slate-50/40 to-white', use: 'ページ背景のグラデーション' },
  { name: 'teal-700', swatch: 'bg-teal-700', use: '見出し・記事タイトルのアクセント文字色' },
  { name: 'teal-600(影響度バッジ・ボタン)', swatch: 'bg-teal-600', use: '影響度バッジ・保存ボタンの背景' },
  { name: 'amber-50 / amber-700', swatch: 'bg-amber-50', use: '「査読前」バッジ' },
  { name: 'gray-700 / gray-400', swatch: 'bg-gray-700', use: '本文・補足テキスト' },
]

const sampleFinding: Finding = {
  id: 'sleep-exercise',
  genre: 'sleep-exercise',
  heading: '週2回の軽い運動でも睡眠の質が上がる可能性',
  body: '成人を対象にした追跡調査で、週2回・30分程度の軽い運動を続けた人は、運動しない人より入眠までの時間が短く、夜中に目が覚める回数も少ない傾向が見られた。特別な器具は不要で、日常に取り入れやすい。',
  impact: 'high',
  impactReason: '多くの人が今日から取り入れられる習慣に関わるため',
  sourceTitle: 'Light exercise and sleep quality in adults',
  sourceName: 'Journal of Sleep Research',
  sourceUrl: 'https://example.com/paper',
  doi: null,
  publishedYear: 2026,
  isPreprint: false,
}

const findingEntry: GenreEntry = { genre: sampleFinding.genre, kind: 'finding', finding: sampleFinding }
const preprintFinding: Finding = {
  ...sampleFinding,
  id: 'ai-it',
  genre: 'ai-it',
  heading: '小型モデルでも要約の精度が保てる可能性',
  impact: 'medium',
  isPreprint: true,
}
const preprintEntry: GenreEntry = { genre: 'ai-it', kind: 'finding', finding: preprintFinding }
const noCandidateEntry: GenreEntry = { genre: 'medical-health', kind: 'empty', emptyGenre: { genre: 'medical-health', reason: 'no-candidate' } }
const collectionFailedEntry: GenreEntry = {
  genre: 'environment-climate',
  kind: 'empty',
  emptyGenre: { genre: 'environment-climate', reason: 'collection-failed', collectionFailureReason: 'timeout' },
}
const generationFailedEntry: GenreEntry = {
  genre: 'nutrition-food',
  kind: 'empty',
  emptyGenre: { genre: 'nutrition-food', reason: 'generation-failed' },
}

const sampleArticle: Article = {
  id: '2026-10-05-body-life',
  edition: 'body-life',
  date: '2026-10-05',
  findings: [
    sampleFinding,
    { ...sampleFinding, id: 'education-parenting', genre: 'education-parenting', heading: '朝食の内容が午前中の学習集中力に影響する可能性', impact: 'medium', isPreprint: true },
    { ...sampleFinding, id: 'medical-health', genre: 'medical-health', heading: '食後の散歩が血糖値の上昇を抑える可能性', impact: 'medium' },
  ],
  emptyGenres: [],
}
const emptyArticle: Article = {
  id: '2026-09-26-science-society',
  edition: 'science-society',
  date: '2026-09-26',
  findings: [],
  emptyGenres: [],
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-teal-700">{title}</h2>
      {children}
    </section>
  )
}

export default function ResearchDigestStyleguidePage() {
  const [order, setOrder] = useState<SortOrder>('impact')

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-slate-50/40 to-white">
      <main className="mx-auto w-full max-w-3xl space-y-12 px-6 py-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">週刊研究発見 styleguide</h1>
          <p className="text-sm text-gray-500">
            article-detail・article-list・bookmarkと共通のティール系アクセントと共通部品のカタログ(開発者向け確認ページ)。
          </p>
        </header>

        <Section title="配色">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {COLOR_SWATCHES.map((c) => (
              <li key={c.name} className="rounded-lg border border-gray-200 bg-white p-2">
                <div className={`mb-2 h-12 w-full rounded border border-gray-200 ${c.swatch}`} />
                <p className="font-mono text-xs font-bold text-gray-700">{c.name}</p>
                <p className="text-xs text-gray-500">{c.use}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="ヘッダー(パンくず見本)">
          <nav aria-label="パンくず(見本)" className="text-[11px] text-gray-400">
            <span className="hover:underline">べんりやつーる</span>
            <span className="mx-1">›</span>
            <span className="hover:underline">週刊研究発見</span>
            <span className="mx-1">›</span>
            <span>週刊研究発見 2026年10月5日号</span>
          </nav>
        </Section>

        <Section title="ジャンル・影響度・査読前のバッジ(FindingBadges)">
          <div className="flex flex-wrap items-center gap-3">
            <FindingBadges genre="sleep-exercise" impact="high" />
            <FindingBadges genre="ai-it" impact="medium" isPreprint />
            <FindingBadges genre="medical-health" />
          </div>
        </Section>

        <Section title="記事カード(ArticleCard)">
          <div className="space-y-3">
            <ArticleCard article={sampleArticle} />
            <ArticleCard article={emptyArticle} />
          </div>
        </Section>

        <Section title="並び順の切り替え(SortToggle)">
          <SortToggle order={order} onChange={setOrder} />
        </Section>

        <Section title="研究カード(FindingCard)の各状態(研究あり・査読前・候補なし・収集失敗・生成失敗)">
          <div className="space-y-3">
            <FindingCard entry={findingEntry} articleId="2026-10-05" isAdmin={false} />
            <FindingCard entry={preprintEntry} articleId="2026-10-05" isAdmin={false} />
            <FindingCard entry={noCandidateEntry} articleId="2026-10-05" isAdmin={false} />
            <FindingCard entry={collectionFailedEntry} articleId="2026-10-05" isAdmin={false} />
            <FindingCard entry={generationFailedEntry} articleId="2026-10-05" isAdmin={false} />
          </div>
        </Section>

        <Section title="付箋の操作領域(BookmarkPanel)">
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">未付箋</p>
              <BookmarkPanel articleId="2026-10-05" findingId="sleep-exercise" initialBookmark={null} />
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">付箋あり</p>
              <BookmarkPanel
                articleId="2026-10-05"
                findingId="medical-health"
                initialBookmark={{ id: 'sample', memo: '気になるので後で読み返す' }}
              />
            </div>
          </div>
        </Section>

        <Section title="ページネーション(Pagination)">
          <Pagination currentPage={2} totalPages={3} />
        </Section>

        <Section title="フッター(LoginStatus・未ログイン/ログイン中)">
          <div className="space-y-2">
            <LoginStatus session={null} onLoginClick={() => {}} onLogoutClick={() => {}} />
            <LoginStatus
              session={{ user: { email: 'reader@example.com' } } as never}
              onLoginClick={() => {}}
              onLogoutClick={() => {}}
            />
          </div>
        </Section>

        <Section title="一覧ページへ戻る">
          <Link href="/research-digest" className="text-sm font-semibold text-teal-700 hover:underline">
            /research-digest に戻る
          </Link>
        </Section>
      </main>
    </div>
  )
}
