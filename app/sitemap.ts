import type { MetadataRoute } from 'next'
import { SITE_URL } from './lib/site'
import { GUIDE_ARTICLES, LAST_UPDATED_ISO } from './ikukyu/guide/lib/articleMeta'
import { getAllArticles } from './ai-dev-digest/lib/articles'
import { paginate } from './ai-dev-digest/lib/pagination'

// Next.js固有の挙動差分: output: 'export'構成では、sitemap.tsのような特殊なRoute Handlerに
// dynamic = 'force-static'を明示しないとビルドが失敗する(nextjs-notes.md参照)
export const dynamic = 'force-static'

// 仕様: specs/hub-site/requirements.md#機能要件-5
// 静的エクスポート(next.config.tsのoutput: 'export')でもビルド時にこの関数が1回実行され、
// out/sitemap.xmlとして出力される。手動でpublic/sitemap.xmlを更新する運用をやめ、
// 公開中の全ページを自動列挙する。管理画面(ログイン必須)・styleguide(開発者向け確認用)・
// bookmarks(ログイン中の読者ごとに内容が異なる個人ページ)は対象外とする
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, priority: 1.0 },
    { url: `${SITE_URL}/legal/`, lastModified: now, priority: 0.3 },
    { url: `${SITE_URL}/ikukyu/`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/ikukyu/guide/`, lastModified: LAST_UPDATED_ISO, priority: 0.6 },
    { url: `${SITE_URL}/life-money-sim/`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/ai-dev-digest/`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/board-game-rules/`, lastModified: now, priority: 0.8 },
    { url: `${SITE_URL}/board-game-rules/register/`, lastModified: now, priority: 0.5 },
    { url: `${SITE_URL}/board-game-rules/favorites/`, lastModified: now, priority: 0.5 },
  ]

  const guidePages: MetadataRoute.Sitemap = GUIDE_ARTICLES.map((article) => ({
    url: `${SITE_URL}/ikukyu/guide/${article.slug}/`,
    lastModified: LAST_UPDATED_ISO,
    priority: 0.7,
  }))

  const articles = getAllArticles()
  const articlePages: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/ai-dev-digest/${article.date}/`,
    lastModified: article.date,
    priority: 0.6,
  }))

  const { totalPages } = paginate(articles, 1)
  const paginationPages: MetadataRoute.Sitemap = Array.from(
    { length: Math.max(0, totalPages - 1) },
    (_, i) => ({
      url: `${SITE_URL}/ai-dev-digest/page/${i + 2}/`,
      lastModified: now,
      priority: 0.4,
    })
  )

  return [...staticPages, ...guidePages, ...articlePages, ...paginationPages]
}
