import type { SourceType } from '../lib/types'

type Props = {
  sourceType: SourceType
}

// 情報源種別を日本語ラベルのバッジで表示する(仕様: requirements.md#記事本文表示-3)
const LABELS: Record<SourceType, string> = {
  official: '公式組織',
  'individual-youtube': '個人YouTube',
  'individual-blog': '個人ブログ',
  qiita: 'Qiita',
  zenn: 'Zenn',
}

export default function SourceBadge({ sourceType }: Props) {
  return (
    <span className="inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs font-extrabold text-teal-600">
      {LABELS[sourceType]}
    </span>
  )
}
