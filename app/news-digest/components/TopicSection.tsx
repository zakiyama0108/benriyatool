import type { Topic } from '../lib/types'
import { formatSourcePublishedAt } from '../lib/formatSourcePublishedAt'
import CategoryBadge from './CategoryBadge'
import ImportanceStars from './ImportanceStars'
import FeedbackForm from './FeedbackForm'

// 固定4観点(summary)の描画順。この順序で固定(content-generation/requirements.md#要約-4)
const SUMMARY_ORDER = ['whatHappened', 'whyItMatters', 'background', 'outlook'] as const

type Props = {
  topic: Topic
  isAdmin: boolean
  articleDate: string
}

// 1トピック分の表示(見出し・カテゴリ・重要度・固定4観点の要約・出典・専用枠(基準未達)表示)と、
// 配下に運営者向けフィードバック入力欄を条件付きで表示する(仕様: requirements.md#記事本文表示-1〜7、
// requirements.md#運営者向けフィードバック-9、design.md「その週の記事本文を表示する処理」
// 「ログイン状態に応じてフィードバック入力欄の表示を切り替える処理」)。
// 画面設計はai-dev-digestのTopicSection.tsxを踏襲する(SourceBadge相当をCategoryBadgeに置き換え、
// YoutubeEmbedは持たない)。固定4観点はこの順序(whatHappened→whyItMatters→background→outlook)で
// 常時、見出し(h3)+導入文(teaser)を表示し、<details><summary>詳細を見る</summary>詳細文(detail)
// </details>で展開表示する。
// **DBの読み取り(SELECT)は一切行わない**。isAuthorizedAdmin(admin_emailsのSELECT)の呼び出しは
// ArticleDetailView側の責務とし、ここでは渡されたisAdminの値だけでフィードバック欄の表示を切り替える
export default function TopicSection({ topic, isAdmin, articleDate }: Props) {
  return (
    <section id={topic.id} className="scroll-mt-6 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <CategoryBadge category={topic.category} />
      </div>

      <div className="mb-1 flex items-center gap-2">
        <ImportanceStars importance={topic.importance} />
        <h2 className="text-base font-bold leading-relaxed">{topic.heading}</h2>
      </div>

      <div className="mt-2 space-y-3">
        {SUMMARY_ORDER.map((key) => {
          const perspective = topic.summary[key]
          return (
            <div key={key}>
              <h3 className="text-sm font-semibold text-gray-800">{perspective.heading}</h3>
              <p className="mt-1 text-sm leading-relaxed text-gray-700">{perspective.teaser}</p>
              <details className="mt-1">
                <summary className="cursor-pointer text-xs font-semibold text-teal-600">詳細を見る</summary>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{perspective.detail}</p>
              </details>
            </div>
          )
        })}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-gray-400">
        出典:{' '}
        <a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {topic.sourceName}
        </a>
        {topic.sourcePublishedAt && `(${formatSourcePublishedAt(topic.sourcePublishedAt)}投稿)`}
      </p>

      {topic.belowCriteria && (
        <div className="mt-2 flex items-center gap-2">
          <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
            専用枠(基準未達)
          </span>
          {topic.belowCriteriaReason && <span className="text-xs text-orange-600">{topic.belowCriteriaReason}</span>}
        </div>
      )}

      {isAdmin && <FeedbackForm articleDate={articleDate} topicId={topic.id} />}
    </section>
  )
}
