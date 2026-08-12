import Link from 'next/link'
import { buildArticleTitle } from '../lib/articleTitle'

type CardTopic = {
  heading: string // 詳細ページと同じ見出し文字列(design.md「カードに表示するトピック見出し・メリット導入文を選ぶ処理」)
  benefitTeaser?: string // CurrentTopic(summaryあり)のみ。🚀メリット観点の導入文(2026-08追加。requirements.md#一覧表示-4)
}

type Props = {
  date: string
  topics: CardTopic[] // 最大3件
  totalTopicCount: number
}

const MAX_HEADINGS = 3

// 1記事分のカード表示(仕様: requirements.md#一覧表示-1〜2・4、requirements.md#ビジネスルール・
// 制約-1、design.md「カードに表示するトピック見出し・メリット導入文を選ぶ処理」)。
// 一覧専用の別要約は作らず、詳細ページと同じ見出し文字列・🚀メリット導入文をそのまま最大3件まで見せる
export default function ArticleCard({ date, topics, totalTopicCount }: Props) {
  const shownTopics = topics.slice(0, MAX_HEADINGS)
  const remainingCount = totalTopicCount - shownTopics.length

  return (
    <Link
      href={`/ai-dev-digest/${date}`}
      className="block rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <p className="text-xs text-gray-400">{date}</p>
      <h2 className="mt-1 text-base font-bold leading-relaxed text-teal-600">{`${buildArticleTitle(date)} →`}</h2>
      <ul className="mt-2 space-y-1 text-sm leading-relaxed text-gray-700">
        {shownTopics.map((topic) => (
          <li key={topic.heading}>
            {`・${topic.heading}`}
            {topic.benefitTeaser && <p className="mt-0.5 pl-3 text-xs leading-relaxed text-gray-500">{topic.benefitTeaser}</p>}
          </li>
        ))}
      </ul>
      {remainingCount > 0 && <p className="mt-2 text-xs text-gray-400">{`他${remainingCount}件`}</p>}
    </Link>
  )
}
