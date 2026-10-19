import type { Genre, Impact } from '../lib/types'
import { GENRE_LABELS, IMPACT_LABELS } from '../lib/types'

type Props = {
  genre: Genre
  impact?: Impact
  isPreprint?: boolean
}

// ジャンル・影響度・査読前のバッジ(仕様: requirements.md#記事本文の表示-2、
// content-selection/requirements.md#採用基準-3)。影響度は色だけに意味を持たせず
// 「影響度 大」のように文字でも分かるようにする。impactを渡さない(掲載できなかった)ジャンルでは
// 影響度バッジを出さない
export default function FindingBadges({ genre, impact, isPreprint }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-bold text-teal-700">
        {GENRE_LABELS[genre] ?? genre}
      </span>
      {impact && (
        <span className="rounded-full bg-teal-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
          影響度 {IMPACT_LABELS[impact]}
        </span>
      )}
      {isPreprint && (
        <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700">査読前</span>
      )}
    </div>
  )
}
