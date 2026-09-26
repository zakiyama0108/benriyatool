import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import CategoryBadge from '../../../app/news-digest/components/CategoryBadge'
import type { Category } from '../../../app/news-digest/lib/types'

const LABELS: Record<Category, string> = {
  general: '総合',
  business: '経済・ビジネス',
  kanagawa: '神奈川ローカル',
  childcare: '育児',
}

// 仕様: specs/news-digest/article-detail/requirements.md#記事本文表示-5
describe('カテゴリバッジ - 各トピックのカテゴリ(総合/経済・ビジネス/神奈川ローカル/育児)を日本語で表示する', () => {
  for (const [category, label] of Object.entries(LABELS) as [Category, string][]) {
    it(`categoryが"${category}"のとき、「${label}」というラベルが表示されること`, () => {
      render(<CategoryBadge category={category} />)
      expect(screen.getByText(label)).toBeTruthy()
    })
  }
})
