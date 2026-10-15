'use client'

import Link from 'next/link'
import EditionBadge from '../components/EditionBadge'
import ArticleCard from '../components/ArticleCard'
import Pagination from '../components/Pagination'
import LoginStatus from '../components/LoginStatus'
import DurationBadge from '../components/DurationBadge'
import HeatBadge from '../components/HeatBadge'
import TrendMeta from '../components/TrendMeta'
import GenreSection from '../components/GenreSection'
import TopicCard from '../components/TopicCard'
import type { DurationLabel, HeatLabel } from '../lib/historyTypes'
import type { CurrentTopic, LegacyTopic, TopicTrend } from '../lib/types'

const DURATION_LABEL_VALUES: DurationLabel[] = ['pre-trend', 'emerging', 'talked', 'highly-talked']
const HEAT_LABEL_VALUES: HeatLabel[] = ['high', 'normal', 'low']

function makeTrend(overrides: Partial<TopicTrend>): TopicTrend {
  return {
    durationLabel: 'talked',
    heatLabel: 'high',
    continuationDays: 30,
    continuationStartDate: '2026-08-16',
    reportCount: 1,
    originRegion: null,
    currentRegions: [],
    ...overrides,
  }
}

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

// 旧形式(この機能より前に公開した記事。requirements.md#継続度・注目度の表示-19)の見本
const LEGACY_TOPIC: LegacyTopic = {
  id: 'styleguide-legacy',
  genre: 'music',
  heading: '新曲がストリーミングで急上昇(旧形式の見本)',
  body: 'あるアーティストの新曲がストリーミングサービスの週間ランキングで急上昇した。SNS上での言及数も増えており、今後さらに注目を集める可能性がある。'.repeat(2),
  sourceTitle: 'サンプル楽曲A',
  sourceName: 'Oricon',
  sourceUrl: 'https://example.com/oricon/a',
}

// 新形式(固定3観点)の見本(図解なし)
const CURRENT_TOPIC: CurrentTopic = {
  id: 'styleguide-current',
  genre: 'anime',
  heading: '新作アニメが配信直後に話題化(新形式の見本)',
  sections: {
    fact: {
      heading: '検索数・言及数が公開直後に急上昇',
      text: '配信開始直後から検索数・SNS言及数が急増し、ランキング上位に入った。'.repeat(3),
      diagram: null,
    },
    reason: {
      heading: '原作ファン層+新規層の両方が反応',
      text: '原作既読層が一斉に視聴を始めたことに加え、SNSでの切り抜き拡散により新規層も流入した。'.repeat(3),
      diagram: null,
    },
    caveat: {
      heading: '放送継続による定着はまだ見通せない',
      text: '初動の盛り上がりであり、継続的な話題化につながるかは今後数週間の動向次第である。'.repeat(3),
      diagram: null,
    },
  },
  sourceTitle: 'サンプル作品B',
  sourceName: 'Googleトレンド',
  sourceUrl: 'https://example.com/trends/b',
  trend: makeTrend({ reportCount: 1, originRegion: null, currentRegions: [] }),
}

// 画像生成(Cloudflare Workers AI)の代わりに使うダミー画像(インラインSVGのdata URI)。
// 実ファイルの有無に依存させず、styleguideが常に画像付きの見た目を再現できるようにする
const DUMMY_DIAGRAM_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='160'%3E%3Crect width='320' height='160' fill='%23fef3c7'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dominant-baseline='middle' font-size='16' fill='%23b45309'%3E生成画像の見本%3C/text%3E%3C/svg%3E"

// 新形式+図解あり(mermaid/image)の見本(design.md「その回の記事本文を表示する処理」手順3-2)
const CURRENT_TOPIC_WITH_DIAGRAMS: CurrentTopic = {
  ...CURRENT_TOPIC,
  id: 'styleguide-current-diagram',
  sections: {
    fact: {
      ...CURRENT_TOPIC.sections.fact,
      diagram: { type: 'mermaid', code: 'flowchart LR\n配信開始 --> 検索数急増 --> ランキング上位' },
    },
    reason: {
      ...CURRENT_TOPIC.sections.reason,
      diagram: { type: 'image', path: DUMMY_DIAGRAM_IMAGE },
    },
    caveat: CURRENT_TOPIC.sections.caveat,
  },
}

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

        <Section title="継続度ラベルのバッジ(DurationBadge・全4段階)">
          <div className="flex flex-wrap items-center gap-3">
            {DURATION_LABEL_VALUES.map((label) => (
              <DurationBadge key={label} label={label} />
            ))}
          </div>
        </Section>

        <Section title="注目度ラベルのバッジ(HeatBadge・全3段階)">
          <div className="flex flex-wrap items-center gap-3">
            {HEAT_LABEL_VALUES.map((label) => (
              <HeatBadge key={label} label={label} />
            ))}
          </div>
        </Section>

        <Section title="トレンド情報の行(TrendMeta)">
          <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400">地域あり・続報(2回目以降)</p>
            <TrendMeta trend={makeTrend({ reportCount: 3, originRegion: '日本', currentRegions: ['日本', '北米'] })} />
            <p className="mt-3 text-xs font-bold text-gray-400">地域なし・初掲載</p>
            <TrendMeta trend={makeTrend({ reportCount: 1, originRegion: null, currentRegions: [] })} />
          </div>
        </Section>

        <Section title="話題を取得できなかったジャンルの表示(GenreSection)">
          <GenreSection genre="music" topics={[]} unavailable isAdmin={false} articleId="styleguide-sample" />
        </Section>

        <Section title="旧形式(単一body)のトピック表示(TopicCard)">
          <TopicCard topic={LEGACY_TOPIC} isAdmin={false} articleId="styleguide-sample" />
        </Section>

        <Section title="新形式(固定3観点sections)のトピック表示(TopicCard・図解なし)">
          <TopicCard topic={CURRENT_TOPIC} isAdmin={false} articleId="styleguide-sample" />
        </Section>

        <Section title="新形式のトピック表示(TopicCard・図解あり: mermaid/image)">
          <TopicCard topic={CURRENT_TOPIC_WITH_DIAGRAMS} isAdmin={false} articleId="styleguide-sample" />
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
