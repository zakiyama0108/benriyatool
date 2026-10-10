import Link from 'next/link'
import type { Article } from '../lib/types'
import { IMPACT_LABELS } from '../lib/types'
import { buildArticleTitle } from '../lib/articleTitle'
import { selectCardHeadings } from '../lib/selectCardHeadings'
import EditionBadge from './EditionBadge'

type Props = {
  article: Article
}

// 1回分のカード表示(仕様: article-list/requirements.md#一覧表示-1〜3、article-list/design.md「画面設計」)。
// 見出しが0件(採用0件の回)のときは見出し欄自体を表示しない
export default function ArticleCard({ article }: Props) {
  const title = buildArticleTitle(article.date, article.edition)
  const headings = selectCardHeadings(article)

  return (
    <Link
      href={`/research-digest/${article.id}`}
      className="block rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="flex items-center gap-2">
        <EditionBadge edition={article.edition} />
        <p className="text-xs text-gray-400">{article.date}</p>
      </div>
      <h2 className="mt-1 text-base font-bold leading-relaxed text-teal-700">{title}</h2>
      {headings.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-gray-700">
          {headings.map((h) => (
            <li key={h.genre} className="flex items-center gap-1.5">
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                {IMPACT_LABELS[h.impact]}
              </span>
              {h.isPreprint && (
                <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                  査読前
                </span>
              )}
              <span>{h.heading}</span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  )
}
