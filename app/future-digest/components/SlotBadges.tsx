import type { Genre, Horizon, Impact } from '../lib/types'
import { GENRE_LABELS, HORIZON_LABELS, IMPACT_LABELS } from '../lib/types'

type Props = {
  genre: Genre
  horizon: Horizon
  impact?: Impact
}

// ジャンル・時間軸・影響度のバッジ(仕様: requirements.md#記事本文の表示-2)。
// 影響度は色だけに意味を持たせず「影響度 大」のように文字でも分かるようにする
// (design.md「画面設計」)。impactを渡さない枠(候補なし・収集失敗・生成失敗)では
// 影響度バッジ自体を出さない
export default function SlotBadges({ genre, horizon, impact }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
        {GENRE_LABELS[genre] ?? genre}
      </span>
      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
        {HORIZON_LABELS[horizon]}
      </span>
      {impact && (
        <span className="rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
          影響度 {IMPACT_LABELS[impact]}
        </span>
      )}
    </div>
  )
}
