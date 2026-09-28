'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Slot, SortOrder } from '../lib/sortSlots'
import type { Prediction } from '../lib/types'
import SlotBadges from '../components/SlotBadges'
import ArticleCard from '../components/ArticleCard'
import PredictionCard from '../components/PredictionCard'
import SortToggle from '../components/SortToggle'
import Pagination from '../components/Pagination'
import BookmarkPanel from '../components/BookmarkPanel'
import LoginStatus from '../components/LoginStatus'

// 週刊未来予測(future-digest)の共通部品カタログ(styleguide)。開発者向け確認用ページで、
// 利用者向けの公開機能ではない(sitemap除外: specs/hub-site/requirements.md#機能要件-5)。
// article-detail・article-list・bookmarkと共通のTailwindユーティリティ(インディゴ系)を
// そのまま使う設計のため、実際に使っている配色クラスと共通部品をそのまま並べて写す
// (仕様: article-detail/design.md「画面設計」。Step0は実施しない方針)。
// フォルダ名にアンダースコアは付けない(_styleguideはNext.jsのprivate folderで生きたURLに
// 遷移できないため。styleguide.pngキャプチャのため生きたURLが必要)

const COLOR_SWATCHES: { name: string; swatch: string; use: string }[] = [
  { name: 'indigo-50 → slate-50/40 → white', swatch: 'bg-gradient-to-b from-indigo-50 via-slate-50/40 to-white', use: 'ページ背景のグラデーション' },
  { name: 'indigo-700', swatch: 'bg-indigo-700', use: '見出し・記事タイトルのアクセント文字色' },
  { name: 'indigo-600(影響度バッジ・ボタン)', swatch: 'bg-indigo-600', use: '影響度バッジ・保存ボタンの背景' },
  { name: 'gray-700 / gray-400', swatch: 'bg-gray-700', use: '本文・補足テキスト' },
]

const samplePrediction: Prediction = {
  id: 'technology-ai--near',
  genre: 'technology-ai',
  horizon: 'near',
  heading: '自律走行がさらに普及する',
  body: '主要都市圏で自律走行タクシーの商用運行エリアが広がり、通勤・買い物の移動手段として定着しつつある。安全性の実証データが積み重なり、規制緩和の議論も進む見込み。',
  impact: 'high',
  impactReason: '生活の移動手段が大きく変わるため',
  targetPeriod: '2030年まで',
  sourceTitle: '交通白書2026',
  sourceName: '国土交通省',
  sourceUrl: 'https://example.com/report',
}

const predictionSlot: Slot = { genre: samplePrediction.genre, horizon: samplePrediction.horizon, kind: 'prediction', prediction: samplePrediction }
const noCandidateSlot: Slot = { genre: 'medical-health', horizon: 'near', kind: 'empty', emptySlot: { genre: 'medical-health', horizon: 'near', reason: 'no-candidate' } }
const collectionFailedSlot: Slot = {
  genre: 'environment-energy',
  horizon: 'near',
  kind: 'empty',
  emptySlot: { genre: 'environment-energy', horizon: 'near', reason: 'collection-failed', collectionFailureReason: 'timeout' },
}
const generationFailedSlot: Slot = { genre: 'economy-work', horizon: 'near', kind: 'empty', emptySlot: { genre: 'economy-work', horizon: 'near', reason: 'generation-failed' } }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-indigo-700">{title}</h2>
      {children}
    </section>
  )
}

export default function FutureDigestStyleguidePage() {
  const [order, setOrder] = useState<SortOrder>('impact')

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-slate-50/40 to-white">
      <main className="mx-auto w-full max-w-3xl space-y-12 px-6 py-10">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">週刊未来予測 styleguide</h1>
          <p className="text-sm text-gray-500">
            article-detail・article-list・bookmarkと共通のインディゴ系アクセントと共通部品のカタログ(開発者向け確認ページ)。
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
            <span className="hover:underline">週刊未来予測</span>
            <span className="mx-1">›</span>
            <span>週刊未来予測 2026年10月1日号</span>
          </nav>
        </Section>

        <Section title="ジャンル・時間軸・影響度のバッジ(SlotBadges)">
          <div className="flex flex-wrap items-center gap-3">
            <SlotBadges genre="technology-ai" horizon="near" impact="high" />
            <SlotBadges genre="sexuality-romance" horizon="long" />
          </div>
        </Section>

        <Section title="記事カード(ArticleCard)">
          <div className="space-y-3">
            <ArticleCard
              article={{ id: '2026-10-01', date: '2026-10-01', issueNumber: 1, predictions: [], emptySlots: [] }}
              headings={[
                { heading: '自律走行がさらに普及する', impact: 'high' },
                { heading: '再生医療の適用範囲が広がる', impact: 'medium' },
              ]}
            />
            <ArticleCard article={{ id: '2026-09-24', date: '2026-09-24', issueNumber: 2, predictions: [], emptySlots: [] }} headings={[]} />
          </div>
        </Section>

        <Section title="並び順の切り替え(SortToggle)">
          <SortToggle order={order} onChange={setOrder} />
        </Section>

        <Section title="予測カード(PredictionCard)の各状態">
          <div className="space-y-3">
            <PredictionCard slot={predictionSlot} articleId="2026-10-01" isAdmin={false} />
            <PredictionCard slot={noCandidateSlot} articleId="2026-10-01" isAdmin={false} />
            <PredictionCard slot={collectionFailedSlot} articleId="2026-10-01" isAdmin={false} />
            <PredictionCard slot={generationFailedSlot} articleId="2026-10-01" isAdmin={false} />
          </div>
        </Section>

        <Section title="付箋の操作領域(BookmarkPanel)">
          <div className="space-y-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">未付箋</p>
              <BookmarkPanel articleId="2026-10-01" predictionId="technology-ai--near" initialBookmark={null} />
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-400">付箋あり</p>
              <BookmarkPanel
                articleId="2026-10-01"
                predictionId="medical-health--near"
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
          <Link href="/future-digest" className="text-sm font-semibold text-indigo-700 hover:underline">
            /future-digest に戻る
          </Link>
        </Section>
      </main>
    </div>
  )
}
