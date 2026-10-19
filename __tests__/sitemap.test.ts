import { describe, it, expect } from 'vitest'
import sitemap from '../app/sitemap'
import { SITE_URL } from '../app/lib/site'
import { GUIDE_ARTICLES } from '../app/ikukyu/guide/lib/articleMeta'
import { getAllArticles } from '../app/ai-dev-digest/lib/articles'
import { paginate } from '../app/ai-dev-digest/lib/pagination'
import { getAllArticles as getAllTrendDigestArticles } from '../app/trend-digest/lib/articles'
import { paginate as paginateTrendDigest } from '../app/trend-digest/lib/pagination'
import { getAllArticles as getAllFutureDigestArticles } from '../app/future-digest/lib/articles'
import { paginate as paginateFutureDigest } from '../app/future-digest/lib/pagination'
import { getAllArticles as getAllResearchDigestArticles } from '../app/research-digest/lib/articles'
import { paginate as paginateResearchDigest } from '../app/research-digest/lib/pagination'

// 仕様: specs/hub-site/requirements.md#機能要件-5
describe('サイトマップの動的生成 - ビルド時に公開中の全ページを自動列挙する', () => {
  const urls = sitemap().map((entry) => entry.url)

  it('サイト全体・各アプリのトップページが含まれること', () => {
    expect(urls).toContain(`${SITE_URL}/`)
    expect(urls).toContain(`${SITE_URL}/legal/`)
    expect(urls).toContain(`${SITE_URL}/ikukyu/`)
    expect(urls).toContain(`${SITE_URL}/life-money-sim/`)
    expect(urls).toContain(`${SITE_URL}/ai-dev-digest/`)
    expect(urls).toContain(`${SITE_URL}/board-game-rules/`)
    expect(urls).toContain(`${SITE_URL}/spotify-playlist/`)
    expect(urls).toContain(`${SITE_URL}/trend-digest/`)
    expect(urls).toContain(`${SITE_URL}/future-digest/`)
    expect(urls).toContain(`${SITE_URL}/research-digest/`)
  })

  it('ブログダイジェストハブページ(/blog)が含まれること', () => {
    expect(urls).toContain(`${SITE_URL}/blog/`)
  })

  it('board-game-rulesの公開画面(register・favorites)が含まれること', () => {
    expect(urls).toContain(`${SITE_URL}/board-game-rules/register/`)
    expect(urls).toContain(`${SITE_URL}/board-game-rules/favorites/`)
  })

  it('育休給付金ガイド記事一覧と記事本体(GUIDE_ARTICLES全件)が含まれること', () => {
    expect(urls).toContain(`${SITE_URL}/ikukyu/guide/`)
    for (const article of GUIDE_ARTICLES) {
      expect(urls).toContain(`${SITE_URL}/ikukyu/guide/${article.slug}/`)
    }
  })

  it('AI駆動開発ダイジェストの記事詳細が現存記事の件数分すべて含まれること', () => {
    const articles = getAllArticles()
    for (const article of articles) {
      expect(urls).toContain(`${SITE_URL}/ai-dev-digest/${article.date}/`)
    }
  })

  it('AI駆動開発ダイジェストの2ページ目以降(存在する場合のみ)が含まれること', () => {
    const { totalPages } = paginate(getAllArticles(), 1)
    for (let page = 2; page <= totalPages; page++) {
      expect(urls).toContain(`${SITE_URL}/ai-dev-digest/page/${page}/`)
    }
    // 現状totalPages=1で2ページ目は存在しないため、ここでは1ページ目のURLが
    // 誤って含まれていないことも確認する
    expect(urls).not.toContain(`${SITE_URL}/ai-dev-digest/page/1/`)
  })

  it('週刊トレンドの記事詳細が現存記事の件数分すべて含まれること', () => {
    const articles = getAllTrendDigestArticles()
    for (const article of articles) {
      expect(urls).toContain(`${SITE_URL}/trend-digest/${article.id}/`)
    }
  })

  it('週刊トレンドの2ページ目以降(存在する場合のみ)が含まれること', () => {
    const { totalPages } = paginateTrendDigest(getAllTrendDigestArticles(), 1)
    for (let page = 2; page <= totalPages; page++) {
      expect(urls).toContain(`${SITE_URL}/trend-digest/page/${page}/`)
    }
    expect(urls).not.toContain(`${SITE_URL}/trend-digest/page/1/`)
  })

  it('週刊未来予測の記事詳細が現存記事の件数分すべて含まれること', () => {
    const articles = getAllFutureDigestArticles()
    for (const article of articles) {
      expect(urls).toContain(`${SITE_URL}/future-digest/${article.id}/`)
    }
  })

  it('週刊未来予測の2ページ目以降(存在する場合のみ)が含まれること', () => {
    const { totalPages } = paginateFutureDigest(getAllFutureDigestArticles(), 1)
    for (let page = 2; page <= totalPages; page++) {
      expect(urls).toContain(`${SITE_URL}/future-digest/page/${page}/`)
    }
    expect(urls).not.toContain(`${SITE_URL}/future-digest/page/1/`)
  })

  it('週刊研究発見の記事詳細が現存記事の件数分すべて含まれること', () => {
    for (const article of getAllResearchDigestArticles()) {
      expect(urls).toContain(`${SITE_URL}/research-digest/${article.id}/`)
    }
  })

  it('週刊研究発見の2ページ目以降(存在する場合のみ)が含まれること', () => {
    const { totalPages } = paginateResearchDigest(getAllResearchDigestArticles(), 1)
    for (let page = 2; page <= totalPages; page++) {
      expect(urls).toContain(`${SITE_URL}/research-digest/page/${page}/`)
    }
    expect(urls).not.toContain(`${SITE_URL}/research-digest/page/1/`)
  })

  it('管理画面・styleguide・bookmarksは検索対象外のため含まれないこと', () => {
    expect(urls.some((url) => url.includes('/admin'))).toBe(false)
    expect(urls).not.toContain(`${SITE_URL}/board-game-rules/styleguide/`)
    expect(urls).not.toContain(`${SITE_URL}/spotify-playlist/styleguide/`)
    expect(urls).not.toContain(`${SITE_URL}/ai-dev-digest/bookmarks/`)
    expect(urls).not.toContain(`${SITE_URL}/trend-digest/styleguide/`)
    expect(urls).not.toContain(`${SITE_URL}/future-digest/styleguide/`)
    expect(urls).not.toContain(`${SITE_URL}/future-digest/bookmarks/`)
    expect(urls).not.toContain(`${SITE_URL}/research-digest/styleguide/`)
    expect(urls).not.toContain(`${SITE_URL}/research-digest/bookmarks/`)
  })

  // 仕様: specs/blog/source-directory/requirements.md#閲覧できる人-2
  it('5アプリ共通の情報源一覧(運営者専用)は検索対象外のため含まれないこと(既存の/**/admin/**除外ルールが効いている)', () => {
    expect(urls).not.toContain(`${SITE_URL}/blog/admin/sources/`)
  })
})
