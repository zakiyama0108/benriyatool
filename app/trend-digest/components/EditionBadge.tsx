import type { Edition } from '../lib/types'

type Props = {
  edition: Edition
}

// グループ(エンタメ編/カルチャー編)を示すバッジ表示(仕様: requirements.md#一覧表示-2)。
// 一覧の時点でどちらの回の記事かをひと目で見分けられるようにする
const LABELS: Record<Edition, string> = {
  entertainment: 'エンタメ',
  'culture-lifestyle': 'カルチャー',
}

export default function EditionBadge({ edition }: Props) {
  return (
    <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-extrabold text-amber-700">
      {LABELS[edition]}
    </span>
  )
}
