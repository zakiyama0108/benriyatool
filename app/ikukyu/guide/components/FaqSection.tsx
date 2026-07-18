import { GUIDE_THEMES, type GuideTheme } from '../lib/theme'

// FAQの1項目。画面表示(FaqSection)とFAQPage構造化データ(ArticleJsonLd)の
// 両方にこの同じ配列を渡すことで、表示とJSON-LDの内容ズレを防ぐ
export type FaqItem = {
  question: string
  answer: string
}

type Props = {
  faqs: FaqItem[]
  theme: GuideTheme
}

// 記事末尾の開閉式Q&Aセクション
export default function FaqSection({ faqs, theme }: Props) {
  const t = GUIDE_THEMES[theme]
  return (
    <section>
      <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
        <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold ${t.accentSoftBg}`}>
          Q&A
        </span>
        よくある質問
      </h2>
      <div>
        {faqs.map((faq) => (
          <details key={faq.question} className="border-b border-gray-100 py-2.5 text-sm last:border-b-0">
            <summary className="cursor-pointer font-semibold">{faq.question}</summary>
            <p className="mt-1.5 leading-relaxed text-gray-600">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  )
}
