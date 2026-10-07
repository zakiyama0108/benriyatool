import Link from 'next/link'
import type { Article } from '../lib/types'
import { HORIZON_LABELS, IMPACT_LABELS, horizonsForIssue } from '../lib/types'
import { buildArticleTitle } from '../lib/articleTitle'
import type { CardHeading } from '../lib/selectCardHeadings'
import EditionBadge from './EditionBadge'

type Props = {
  article: Article
  headings: CardHeading[] // 最大3件(design.md「各回に載せる見出しを選ぶ処理」)
}

// 1回分のカード表示(仕様: requirements.md#一覧表示-1〜3、design.md「画面設計」)。
// 見出しが0件(採用0件の回)のときは見出し欄自体を表示しない
export default function ArticleCard({ article, headings }: Props) {
  const title = buildArticleTitle(article.date, article.edition)
  const horizons = horizonsForIssue(article.issueNumber)

  return (
    <Link
      href={`/future-digest/${article.id}`}
      className="block rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="flex items-center gap-2">
        <EditionBadge edition={article.edition} />
        <p className="text-xs text-gray-400">{article.date}</p>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
          {HORIZON_LABELS[horizons[0]]}
        </span>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
          {HORIZON_LABELS[horizons[1]]}
        </span>
      </div>
      <h2 className="mt-1 text-base font-bold leading-relaxed text-indigo-700">{title}</h2>
      {headings.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm leading-relaxed text-gray-700">
          {headings.map((h) => (
            <li key={h.heading} className="flex items-center gap-1.5">
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                {IMPACT_LABELS[h.impact]}
              </span>
              <span>{h.heading}</span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  )
}
