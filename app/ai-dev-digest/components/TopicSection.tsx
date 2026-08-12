import type { Session } from '@supabase/supabase-js'
import { isLegacyTopic, type SummaryPerspective, type Topic } from '../lib/types'
import { formatSourcePublishedAt } from '../lib/formatSourcePublishedAt'
import SourceBadge from './SourceBadge'
import YoutubeEmbed from './YoutubeEmbed'
import FeedbackForm from './FeedbackForm'
import ImportanceStars from './ImportanceStars'
import BookmarkPanel, { type BookmarkSummary } from './BookmarkPanel'

// 固定4観点(summary)の描画順。この順序で固定(content-generation/requirements.md#要約-5・12)
const SUMMARY_ORDER = ['benefit', 'whatsNew', 'how', 'howToUse'] as const

type Props = {
  topic: Topic
  session: Session | null
  isAdmin: boolean
  articleDate: string
  bookmark: BookmarkSummary | null
}

// 1トピック分の表示(見出し・章立て要約(sections)・出典・種別バッジ・YouTube埋め込み・
// 基準未達表示)と、配下に付箋操作・フィードバック入力欄を条件付きで表示する
// (仕様: requirements.md#記事本文表示-1〜4、design.md「その日の記事本文を表示する処理」
// 「ログイン状態に応じてフィードバック入力欄の表示を切り替える処理」、bookmark/design.md
// 「コンポーネント設計」)。sectionsは配列順にセクション見出し(h3)+導入文(teaser、常時表示)+
// <details><summary>詳細を見る</summary>詳細文(detail)</details>(展開表示)で構成する
// **DBの読み取り(SELECT)は一切行わない**。isAuthorizedAdmin(admin_emailsのSELECT)の呼び出しは
// ArticleDetailView側の責務とし、ここでは渡されたisAdminの値だけでフィードバック欄の表示を切り替える
// (design.md参照。architecture.md#12-セキュリティ)。付箋操作(BookmarkPanel)はセッションの有無だけで
// 表示を切り替える(bookmark/requirements.md#トピックへの付箋-5。運営者判定は不要)
export default function TopicSection({ topic, session, isAdmin, articleDate, bookmark }: Props) {
  return (
    <section id={topic.id} className="scroll-mt-6 rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-2 flex items-center gap-2">
        <SourceBadge sourceType={topic.sourceType} />
        {topic.belowCriteria && (
          <span className="inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
            採用基準未達
          </span>
        )}
      </div>

      <div className="mb-1 flex items-center gap-2">
        {!isLegacyTopic(topic) && <ImportanceStars importance={topic.importance} />}
        <h2 className="text-base font-bold leading-relaxed">{topic.heading}</h2>
      </div>

      <div className="mt-2 space-y-3">
        {(isLegacyTopic(topic)
          ? topic.sections
          : SUMMARY_ORDER.map((key): SummaryPerspective => topic.summary[key])
        ).map((section, index) => (
          <div key={index}>
            <h3 className="text-sm font-semibold text-gray-800">{section.heading}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-700">{section.teaser}</p>
            <details className="mt-1">
              <summary className="cursor-pointer text-xs font-semibold text-teal-600">詳細を見る</summary>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{section.detail}</p>
            </details>
          </div>
        ))}
      </div>

      {topic.belowCriteria && topic.belowCriteriaReason && (
        <p className="mt-1 text-xs text-orange-600">{topic.belowCriteriaReason}</p>
      )}

      {topic.youtubeVideoId && (
        <div className="mt-4">
          <YoutubeEmbed videoId={topic.youtubeVideoId} />
        </div>
      )}

      <p className="mt-3 text-xs leading-relaxed text-gray-400">
        出典:{' '}
        <a href={topic.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {topic.sourceName}
        </a>
        {topic.sourcePublishedAt && `(${formatSourcePublishedAt(topic.sourcePublishedAt)}投稿)`}
      </p>

      {session && (
        <BookmarkPanel articleDate={articleDate} topicId={topic.id} initialBookmark={bookmark} />
      )}

      {isAdmin && <FeedbackForm articleDate={articleDate} topicId={topic.id} />}
    </section>
  )
}
