import type { Category } from '../lib/types'

type Props = {
  category: Category
}

// カテゴリ(総合/経済・ビジネス/神奈川ローカル/育児)を日本語ラベルのバッジで表示する
// (仕様: requirements.md#記事本文表示-5。ai-dev-digestのSourceBadge.tsxと同じスタイルパターン)
const LABELS: Record<Category, string> = {
  general: '総合',
  business: '経済・ビジネス',
  kanagawa: '神奈川ローカル',
  childcare: '育児',
}

export default function CategoryBadge({ category }: Props) {
  return (
    <span className="inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs font-extrabold text-teal-600">
      {LABELS[category]}
    </span>
  )
}
