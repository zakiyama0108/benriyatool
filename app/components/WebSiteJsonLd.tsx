import { SITE_NAME, SITE_URL } from '../lib/site'

// Google検索結果にドメイン名ではなくサイト名「べんりやつーる」を表示させるための
// WebSite構造化データ(JSON-LD)。og:site_nameだけではGoogleがサイト名を認識しないため、
// schema.orgのWebSiteスキーマをトップページに設置して明示する
export default function WebSiteJsonLd() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  }

  // XSS対策: Next.jsのJSON-LDガイドに従い、`<`をユニコード等価のエスケープ表現(u003c)に置換して
  // スクリプトタグの挿入を防ぐ(JSON-LDは実行コードではないためnext/scriptではなく素のscriptを使う)
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  )
}
