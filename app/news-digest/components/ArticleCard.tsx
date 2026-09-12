import Link from 'next/link'
import { buildArticleTitle } from '../lib/articleTitle'
import type { CardTopic } from '../lib/selectCardTopics'
import CategoryBadge from './CategoryBadge'

type Props = {
  date: string
  topics: CardTopic[] // selectCardTopics()で選ばれた最大3件
  totalTopicCount: number
}

const MAX_HEADINGS = 3

// 1記事分のカード表示(仕様: requirements.md#一覧表示-1〜2・4〜5、requirements.md#ビジネスルール・
// 制約-1、design.md「カードに表示するトピック見出し・導入文を選ぶ処理」)。ai-dev-digestの
// ArticleCard.tsxと同じ構造に、カテゴリバッジと「何が起きたか」導入文を追加している
export default function ArticleCard({ date, topics, totalTopicCount }: Props) {
  const shownTopics = topics.slice(0, MAX_HEADINGS)
  const remainingCount = totalTopicCount - shownTopics.length

  return (
    <Link
      href={`/news-digest/${date}`}
      className="block rounded-2xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <p className="text-xs text-gray-400">{date}</p>
      <h2 className="mt-1 text-base font-bold leading-relaxed text-teal-600">{`${buildArticleTitle(date)} →`}</h2>
      <ul className="mt-2 space-y-2 text-sm leading-relaxed text-gray-700">
        {shownTopics.map((topic) => (
          <li key={topic.heading}>
            <div className="flex items-center gap-2">
              <span>{`・${topic.heading}`}</span>
              <CategoryBadge category={topic.category} />
            </div>
            <p className="mt-0.5 pl-3 text-xs leading-relaxed text-gray-500">{topic.whatHappenedTeaser}</p>
          </li>
        ))}
      </ul>
      {remainingCount > 0 && <p className="mt-2 text-xs text-gray-400">{`他${remainingCount}件`}</p>}
    </Link>
  )
}
