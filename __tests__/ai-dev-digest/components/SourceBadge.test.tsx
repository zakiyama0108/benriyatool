import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SourceBadge from '../../../app/ai-dev-digest/components/SourceBadge'
import type { SourceType } from '../../../app/ai-dev-digest/lib/types'

const LABELS: Record<SourceType, string> = {
  official: '公式組織',
  'individual-youtube': '個人YouTube',
  'individual-blog': '個人ブログ',
  qiita: 'Qiita',
  zenn: 'Zenn',
}

// 仕様: specs/ai-dev-digest/article-detail/requirements.md#記事本文表示-3
describe('情報源種別バッジ - 各トピックの発信元の種別(公式組織/個人YouTube/個人ブログ/Qiita/Zenn)を日本語で表示する', () => {
  for (const [sourceType, label] of Object.entries(LABELS) as [SourceType, string][]) {
    it(`sourceTypeが"${sourceType}"のとき、「${label}」というラベルが表示されること`, () => {
      render(<SourceBadge sourceType={sourceType} />)
      expect(screen.getByText(label)).toBeTruthy()
    })
  }
})
