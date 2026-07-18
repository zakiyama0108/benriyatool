import { SITE_NAME, SITE_URL } from '../../../lib/site'
import type { FaqItem } from './FaqSection'

type Props = {
  title: string
  description: string
  path: string           // サイトルートからのパス。例: /ikukyu/guide/tedori-10wari/
  dateModified: string   // ISO形式(YYYY-MM-DD)。記事の最終更新日
  faqs?: FaqItem[]       // FAQセクションを持つ記事のみ。FaqSectionと同じ配列を渡す
}

// XSS対策: WebSiteJsonLd(app/components)と同じ方針で、`<`をユニコードエスケープに
// 置換してスクリプトタグの早期終了を防ぐ
function toJsonLdString(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

// ガイド記事のArticle構造化データ(+FAQがあればFAQPage)。
// 検索結果でのリッチリザルト表示と記事情報の明示のために全記事へ設置する
export default function ArticleJsonLd({ title, description, path, dateModified, faqs }: Props) {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `${SITE_URL}${path}`,
    dateModified,
    author: { '@type': 'Organization', name: SITE_NAME },
    publisher: { '@type': 'Organization', name: SITE_NAME },
  }

  const faqPage = faqs && faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  } : null

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLdString(article) }} />
      {faqPage && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLdString(faqPage) }} />
      )}
    </>
  )
}
