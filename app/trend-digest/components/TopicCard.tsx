import type { Topic } from '../lib/types'
import FeedbackForm from './FeedbackForm'

type Props = {
  topic: Topic
  isAdmin: boolean
  articleId: string
}

// 1トピック分の表示(見出し・本文・出典)と、配下に運営者向けフィードバック入力欄を
// isAdminで条件付き表示する(仕様: requirements.md#記事本文表示-3、requirements.md#運営者向け
// フィードバック-5〜6、design.md「その回の記事本文を表示する処理」)。
// **DBの読み取り(SELECT)は一切行わない**。isAuthorizedAdmin(admin_emailsのSELECT)の呼び出しは
// 呼び出し元(ArticleDetailView)の責務とし、ここでは渡されたisAdminの値だけで表示を切り替える
export default function TopicCard({ topic, isAdmin, articleId }: Props) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-base font-bold leading-relaxed">{topic.heading}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{topic.body}</p>
      <p className="mt-3 text-xs leading-relaxed text-gray-400">
        出典:{' '}
        <a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {topic.sourceName}
        </a>
      </p>

      {isAdmin && <FeedbackForm articleId={articleId} topicId={topic.id} />}
    </div>
  )
}
