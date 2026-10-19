import { isLegacyTopic, SECTION_LABELS, type Topic, type TopicSections } from '../lib/types'
import FeedbackForm from './FeedbackForm'
import DurationBadge from './DurationBadge'
import HeatBadge from './HeatBadge'
import TrendMeta from './TrendMeta'
import DiagramView from './DiagramView'

// 固定3観点(sections)の描画順。この順序で固定(content-generation/requirements.md#要約-3)
const SECTION_ORDER: (keyof TopicSections)[] = ['fact', 'reason', 'caveat']

type Props = {
  topic: Topic
  isAdmin: boolean
  articleId: string
}

// 1トピック分の表示(見出し・要約・出典)と、配下に運営者向けフィードバック入力欄を
// isAdminで条件付き表示する(仕様: requirements.md#記事本文表示-3、requirements.md#運営者向け
// フィードバック-5〜6、design.md「その回の記事本文を表示する処理」)。
// 要約の表示はisLegacyTopicで新旧フォーマットを出し分ける(requirements.md#継続度・注目度の表示-19):
// 旧形式(body)はそのまま1段落で表示し、新形式(sections)はfact→reason→caveatの順(SECTION_ORDER)で
// 固定ラベル(SECTION_LABELS)→結論文(heading)→本文(text)→図解(DiagramView)を常時表示する
// (展開操作は設けない。ai-dev-digest/news-digestのTopicSection.tsxと同じisLegacyTopic分岐の考え方)。
// topic.trendがある場合のみ、見出しの隣に継続度・注目度バッジを、本文の上にトレンド情報の行を
// 表示する(requirements.md#継続度・注目度の表示-10、同-18)。trendを持たない過去記事は
// バッジ・トレンド情報行のいずれも表示しない。
// **DBの読み取り(SELECT)は一切行わない**。isAuthorizedAdmin(admin_emailsのSELECT)の呼び出しは
// 呼び出し元(ArticleDetailView)の責務とし、ここでは渡されたisAdminの値だけで表示を切り替える
export default function TopicCard({ topic, isAdmin, articleId }: Props) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-base font-bold leading-relaxed">{topic.heading}</h3>
        {topic.trend && (
          <>
            <DurationBadge label={topic.trend.durationLabel} />
            <HeatBadge label={topic.trend.heatLabel} />
          </>
        )}
      </div>
      {topic.trend && <TrendMeta trend={topic.trend} />}

      {isLegacyTopic(topic) ? (
        <p className="mt-2 text-sm leading-relaxed text-gray-700">{topic.body}</p>
      ) : (
        <div className="mt-2 space-y-3">
          {SECTION_ORDER.map((key) => {
            const section = topic.sections[key]
            return (
              <div key={key}>
                <p data-testid="section-label" className="text-[11px] font-semibold text-indigo-500">
                  {SECTION_LABELS[key]}
                </p>
                <h4 className="text-sm font-semibold text-gray-800">{section.heading}</h4>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">{section.text}</p>
                <DiagramView diagram={section.diagram} />
              </div>
            )
          })}
        </div>
      )}

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
