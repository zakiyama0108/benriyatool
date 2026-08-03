import Link from 'next/link'
import { BookOpen, ExternalLink, List } from 'lucide-react'
import { GUIDE_THEMES, type GuideTheme } from '../lib/theme'
import SimulatorCta from './SimulatorCta'

// PC版(768px以上)の右サイドバーが受け取るProps。
// v0(https://v0.app)のモックアップ(グリッド構成・sticky追従)を参考に構造を取り込み、
// 中身は各記事ページ側で組み立てた実データ(計算エンジン由来の値・既存コンポーネントのデータ)を渡す
export type TocItem = { href: string; label: string }
export type RelatedArticleLink = { slug: string; title: string }
export type SourceLink = { label: string; href: string }

export type ArticleSidebarProps = {
  theme: GuideTheme
  ctaLabel: string
  tocItems?: TocItem[] // 目次(任意)。記事一覧ページでは渡さない
  about?: { title: string; description: string } // 「このガイドについて」カード(任意。目次がない記事一覧ページ用)
  relatedArticles?: RelatedArticleLink[]
  sources?: SourceLink[]
  lastUpdated?: string
}

// PC版(768px以上)の右サイドバー。本文のスクロールに追従(sticky)し、
// 上から「目次」「シミュレーターへのCTA」「関連記事」「参考資料」の順に表示する
// (design.md#PC版レイアウト)。767px以下では非表示にし、既存のモバイル版レイアウトに影響しない
export default function ArticleSidebar({ theme, ctaLabel, tocItems, about, relatedArticles, sources, lastUpdated }: ArticleSidebarProps) {
  const t = GUIDE_THEMES[theme]
  return (
    <aside className="hidden md:sticky md:top-20 md:flex md:flex-col md:gap-4">
      {tocItems && tocItems.length > 0 && (
        <nav aria-label="目次" className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <List className={`h-4 w-4 ${t.accentText}`} aria-hidden="true" />
            目次
          </h2>
          <ol className="space-y-2 text-[13px]">
            {tocItems.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-gray-600 hover:underline">
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {about && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-bold">
            <BookOpen className={`h-4 w-4 ${t.accentText}`} aria-hidden="true" />
            {about.title}
          </h2>
          <p className="text-[13px] leading-relaxed text-gray-600">{about.description}</p>
        </div>
      )}

      <SimulatorCta label={ctaLabel} theme={theme} />

      {relatedArticles && relatedArticles.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold">関連記事</h2>
          <ul className="space-y-2 text-[13px]">
            {relatedArticles.map((article) => (
              <li key={article.slug}>
                <Link href={`/ikukyu/guide/${article.slug}`} className="text-gray-600 hover:underline">
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sources && sources.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold">参考資料</h2>
          <ul className="space-y-2 text-[13px]">
            {sources.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-start gap-1 text-gray-600 hover:underline"
                >
                  <span>{source.label}</span>
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
          {lastUpdated && <p className="mt-2 text-[11px] text-gray-400">最終更新: {lastUpdated}</p>}
        </div>
      )}
    </aside>
  )
}
