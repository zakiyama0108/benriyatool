import type { Slot } from '../lib/sortSlots'
import { COLLECTION_FAILURE_LABELS } from '../lib/types'
import SlotBadges from './SlotBadges'
import FeedbackForm from './FeedbackForm'

type Props = {
  slot: Slot
  articleId: string
  isAdmin: boolean
}

// 1枠分の表示(仕様: requirements.md#記事本文の表示-2〜5、design.md「その回の記事本文を表示する処理」
// 手順3〜4)。予測がある枠は本文・出典・(運営者のみ)フィードバック入力欄を表示し、掲載できなかった
// 枠は理由に応じた3種の文言だけを表示する(候補なし・収集失敗・生成失敗で異なる文言にする)
export default function PredictionCard({ slot, articleId, isAdmin }: Props) {
  if (slot.kind === 'empty') {
    const { emptySlot } = slot
    return (
      <div className="rounded-2xl bg-slate-50 p-4 shadow-sm sm:p-5">
        <SlotBadges genre={slot.genre} horizon={slot.horizon} />
        <p className="mt-3 text-sm text-gray-500">
          {emptySlot.reason === 'no-candidate' && '候補が見つかりませんでした'}
          {emptySlot.reason === 'collection-failed' && (
            <>
              今回は記事を収集できませんでした(
              {COLLECTION_FAILURE_LABELS[emptySlot.collectionFailureReason!]})
            </>
          )}
          {emptySlot.reason === 'generation-failed' && '今回は記事を用意できませんでした'}
        </p>
      </div>
    )
  }

  const { prediction } = slot
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <SlotBadges genre={slot.genre} horizon={slot.horizon} impact={prediction.impact} />
      <p className="mt-2 text-[11px] text-gray-400">{prediction.targetPeriod}</p>
      <h3 className="mt-1 text-base font-bold leading-relaxed">{prediction.heading}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{prediction.body}</p>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">影響度の根拠: {prediction.impactReason}</p>
      <p className="mt-3 text-xs leading-relaxed text-gray-400">
        詳しくは元記事を読む:{' '}
        <a href={prediction.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
          {prediction.sourceName}『{prediction.sourceTitle}』
        </a>
      </p>

      {isAdmin && <FeedbackForm articleId={articleId} predictionId={prediction.id} />}
    </div>
  )
}
