import Link from 'next/link'
import { buildArticleTitle } from '../lib/articleTitle'

type Props = {
  date: string
  topicHeadings: string[] // 詳細ページと同じ見出し文字列を最大3件(design.md「カードに表示するトピック見出しを選ぶ処理」)
  totalTopicCount: number
}

const MAX_HEADINGS = 3

// 1記事分のカード表示(仕様: requirements.md#一覧表示-1〜2、requirements.md#ビジネスルール・
// 制約-1、design.md「カードに表示するトピック見出しを選ぶ処理」)。
// 一覧専用の別要約は作らず、詳細ページと同じ見出し文字列をそのまま最大3件まで見せる
export default function ArticleCard({ date, topicHeadings, totalTopicCount }: Props) {
  const shownHeadings = topicHeadings.slice(0, MAX_HEADINGS)
  const remainingCount = totalTopicCount - shownHeadings.length

  return (
    <Link href={`/ai-dev-digest/${date}`} className="block rounded-2xl border border-gray-200 p-6 hover:bg-gray-50">
      <p className="text-sm text-gray-500">{date}</p>
      <h2 className="mt-1 text-lg font-bold text-gray-900">{buildArticleTitle(date)}</h2>
      <ul className="mt-3 space-y-1 text-sm text-gray-700">
        {shownHeadings.map((heading) => (
          <li key={heading}>{`・${heading}`}</li>
        ))}
      </ul>
      {remainingCount > 0 && <p className="mt-2 text-xs text-gray-400">{`他${remainingCount}件`}</p>}
    </Link>
  )
}
