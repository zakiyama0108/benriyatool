import type { GuideTheme } from '../lib/theme'

// PC版(768px以上)の右サイドバーが受け取るProps。
// v0(https://v0.app)のモックアップ(グリッド構成・sticky追従)を参考に構造だけ取り込み、
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

// TODO(Task 11): 実装は後続のTDDタスク(__tests__/ikukyu/guide/components/ArticleSidebar.test.tsx)で行う
export default function ArticleSidebar({}: ArticleSidebarProps) {
  return null
}
