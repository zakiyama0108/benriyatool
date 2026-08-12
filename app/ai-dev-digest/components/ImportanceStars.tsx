import type { Importance } from '../lib/types'

type Props = {
  importance: Importance
}

const MAX_STARS = 5

// 重要度(★1〜★5)をアイコン表示する(仕様: requirements.md#記事本文表示-12、design.md「コンポーネント設計」。2026-08新規)
export default function ImportanceStars({ importance }: Props) {
  return (
    <span aria-label={`重要度${importance}`} className="text-amber-500">
      {Array.from({ length: MAX_STARS }, (_, index) => (
        <span key={index} aria-hidden="true">
          {index < importance ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}
