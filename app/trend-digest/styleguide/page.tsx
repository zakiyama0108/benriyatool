'use client'

import Link from 'next/link'
import EditionBadge from '../components/EditionBadge'
import ArticleCard from '../components/ArticleCard'
import Pagination from '../components/Pagination'
import LoginStatus from '../components/LoginStatus'

// 週刊トレンド(trend-digest)の共通部品カタログ(styleguide)。開発者向け確認用ページで、
// 利用者向けの公開機能ではない(sitemap除外: specs/hub-site/requirements.md#機能要件-5)。
// trend-digestはbgr-*/sp-*のような専用CSS変数トークンを持たず、article-detailと共通の
// Tailwindユーティリティ(暖色系: amber/orange)をそのまま使う設計のため(design.md「画面設計」)、
// ここでは実際に使っている配色クラスと共通部品をそのまま並べて写す
// (仕様: `.claude/skills/design/SKILL.md`「UIデザインの確定(Step0)」)。
// フォルダ名にアンダースコアは付けない(_styleguideはNext.jsのprivate folderで生きたURLに
// 遷移できないため。styleguide.pngキャプチャのため生きたURLが必要)

const COLOR_SWATCHES: { name: string; swatch: string; use: string }[] = [
  { name: 'amber-50 → orange-50/40 → white', swatch: 'bg-gradient-to-b from-amber-50 via-orange-50/40 to-white', use: 'ページ背景のグラデーション' },
  { name: 'amber-700', swatch: 'bg-amber-700', use: '見出し・記事タイトルのアクセント文字色' },
  { name: 'amber-50(バッジ背景)', swatch: 'bg-amber-50', use: 'グループバッジの背景' },
  { name: 'gray-700 / gray-400', swatch: 'bg-gray-700', use: '本文・補足テキスト' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-amber-700">{title}</h2>
      {children}
    </section>
  )
}

export default function TrendDigestStyleguidePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50/40 to-white">
      <main className="mx-auto w-full max-w-3xl space-y-12 px-6 py-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">週刊トレンド styleguide</h1>
          <p className="text-sm text-gray-500">
            article-detailと共通の暖色系(アンバー/オレンジ)アクセントと共通部品のカタログ(開発者向け確認ページ)。
          </p>
        </header>

        <Section title="配色">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            <span className="hover:underline">週刊トレンド</span>
            <span className="mx-1">›</span>
            <span>週刊トレンド エンタメ編 2026年9月15日号</span>
          </nav>
        </Section>

        <Section title="グループバッジ(EditionBadge)">
          <div className="flex flex-wrap items-center gap-3">
            <EditionBadge edition="entertainment" />
            <EditionBadge edition="culture-lifestyle" />
          </div>
        </Section>

        <Section title="記事カード(ArticleCard)">
          <div className="space-y-3">
            <ArticleCard
              id="2026-09-15-entertainment"
              edition="entertainment"
              date="2026-09-15"
              topicHeadings={['見出しA', '見出しB', '見出しC']}
              totalTopicCount={5}
            />
            <ArticleCard
              id="2026-09-18-culture-lifestyle"
              edition="culture-lifestyle"
              date="2026-09-18"
              topicHeadings={['見出しD']}
              totalTopicCount={1}
            />
          </div>
        </Section>

        <Section title="ページネーション(Pagination)">
          <Pagination currentPage={2} totalPages={3} />
        </Section>

        <Section title="フッター(LoginStatus・未ログイン)">
          <LoginStatus session={null} onLoginClick={() => {}} onLogoutClick={() => {}} />
        </Section>

        <Section title="一覧ページへ戻る">
          <Link href="/trend-digest" className="text-sm font-semibold text-amber-700 hover:underline">
            /trend-digest に戻る
          </Link>
        </Section>
      </main>
    </div>
  )
}
