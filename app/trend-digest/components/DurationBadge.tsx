import type { DurationLabel } from '../lib/historyTypes'
import { DURATION_LABELS } from '../lib/types'

type Props = {
  label: DurationLabel
}

// 段階が進むほど濃くなる暖色系の塗りつぶし(design.md「画面設計」)。色だけに意味を持たせず、
// 必ずDURATION_LABELSの日本語ラベルを併記する(requirements.md#継続度・注目度の表示の扱い-7)
const STYLES: Record<DurationLabel, string> = {
  'pre-trend': 'bg-amber-50 text-amber-600',
  emerging: 'bg-amber-200 text-amber-800',
  talked: 'bg-amber-400 text-amber-950',
  'highly-talked': 'bg-amber-700 text-white',
}

// 継続度ラベルのバッジ(仕様: requirements.md#継続度・注目度の表示-10、requirements.md#継続度・
// 注目度の表示-11、requirements.md#継続度・注目度の表示-13)。「流行前」は、半月以上続いている
// 話題という目安にまだ達していないことが分かるよう補足文言を添える(各ジャンルから必ず1件を
// 掲載する運用のため、目安に達していない話題も掲載されうることが伝わるようにするため)
export default function DurationBadge({ label }: Props) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STYLES[label]}`}>
      {DURATION_LABELS[label]}
      {label === 'pre-trend' && <span className="ml-1 font-normal">(まだ半月未満)</span>}
    </span>
  )
}
