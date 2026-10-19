import type { TopicTrend } from '../lib/types'

type Props = {
  trend: TopicTrend
}

// 継続期間・報告回数・地域の1行表示(仕様: requirements.md#継続度・注目度の表示-14〜16、
// design.md「画面設計」)。ラベルのバッジ(DurationBadge/HeatBadge)は含まない。
// 報告回数は2回目以降のみ、地域は判定できている場合のみ表示し、不明な項目は項目ごと省く
// (「不明」という文字列は出さない。requirements.md#継続度・注目度の表示-16)
export default function TrendMeta({ trend }: Props) {
  const [, month, day] = trend.continuationStartDate.split('-').map((part) => Number(part))

  const parts: string[] = [`${month}月${day}日から継続(${trend.continuationDays}日)`]
  if (trend.reportCount >= 2) {
    parts.push(`${trend.reportCount}回目の報告`)
  }
  if (trend.originRegion !== null) {
    parts.push(`発祥: ${trend.originRegion}`)
  }
  if (trend.currentRegions.length > 0) {
    parts.push(`主な流行地域: ${trend.currentRegions.join('・')}`)
  }

  return <p className="text-xs leading-relaxed text-gray-500">{parts.join(' / ')}</p>
}
