import type { GenreEntry } from '../lib/sortGenres'
import { COLLECTION_FAILURE_LABELS } from '../lib/types'
import FindingBadges from './FindingBadges'
import FeedbackForm from './FeedbackForm'

type Props = {
  entry: GenreEntry
  articleId: string
  isAdmin: boolean
}

// 1ジャンル分の表示(仕様: requirements.md#記事本文の表示-2〜5、design.md「その回の記事本文を表示する処理」
// 手順3〜4)。研究があるジャンルは本文・出典・(運営者のみ)フィードバック入力欄を表示し、
// 掲載できなかったジャンルは理由に応じた3種の文言だけを表示する
// (候補なし・収集失敗・生成失敗で異なる文言にする)。付箋の操作欄はbookmarkの実装時に追加する
export default function FindingCard({ entry, articleId, isAdmin }: Props) {
  if (entry.kind === 'empty') {
    const { emptyGenre } = entry
    return (
      <div className="rounded-2xl bg-slate-50 p-4 shadow-sm sm:p-5">
        <FindingBadges genre={entry.genre} />
        <p className="mt-3 text-sm text-gray-500">
          {emptyGenre.reason === 'no-candidate' && '候補が見つかりませんでした'}
          {emptyGenre.reason === 'collection-failed' && (
            <>
              今回は記事を収集できませんでした(
              {emptyGenre.collectionFailureReason ? COLLECTION_FAILURE_LABELS[emptyGenre.collectionFailureReason] : ''})
            </>
          )}
          {emptyGenre.reason === 'generation-failed' && '今回は記事を用意できませんでした'}
        </p>
      </div>
    )
  }

  const { finding } = entry
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <FindingBadges genre={finding.genre} impact={finding.impact} isPreprint={finding.isPreprint} />
      <h3 className="mt-2 text-base font-bold leading-relaxed">{finding.heading}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{finding.body}</p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">影響度の根拠: {finding.impactReason}</p>
      <p className="mt-3 text-xs leading-relaxed text-gray-400">
        詳しくは元の論文・発表を読む:{' '}
        <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {finding.sourceTitle}
        </a>
        (
        {finding.sourceName}
        {finding.publishedYear !== null && `、${finding.publishedYear}年`})
      </p>
      {isAdmin && <FeedbackForm articleId={articleId} findingId={finding.id} />}
    </div>
  )
}
