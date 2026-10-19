import type { HeatLabel } from '../lib/historyTypes'
import { HEAT_LABELS } from '../lib/types'

type Props = {
  label: HeatLabel
}

// 枠線主体の寒色系(design.md「画面設計」)。DurationBadge(暖色の塗りつぶし)と形・配色の系統を
// 変え、どちらが継続の長さでどちらが今の強さかが見た目で区別できるようにする
// (requirements.md#継続度・注目度の表示の扱い-8)
const STYLES: Record<HeatLabel, string> = {
  high: 'border-2 border-sky-600 text-sky-700',
  normal: 'border border-sky-400 text-sky-600',
  low: 'border border-sky-200 text-sky-400',
}

// 注目度ラベルのバッジ(仕様: requirements.md#継続度・注目度の表示-12、requirements.md#継続度・
// 注目度の表示-13)
export default function HeatBadge({ label }: Props) {
  return (
    <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-[11px] font-bold ${STYLES[label]}`}>
      {HEAT_LABELS[label]}
    </span>
  )
}
