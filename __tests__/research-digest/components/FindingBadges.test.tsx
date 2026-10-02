import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import FindingBadges from '../../../app/research-digest/components/FindingBadges'
import { GENRE_ORDER, GENRE_LABELS } from '../../../app/research-digest/lib/types'

// 仕様: specs/research-digest/article-detail/requirements.md#記事本文の表示-2
describe('ジャンル・影響度・査読前のバッジ表示 - 日本語ラベルのバッジで表示する', () => {
  it('ジャンルが日本語ラベルで表示され、影響度を指定しなければ影響度バッジは出ないこと', () => {
    render(<FindingBadges genre={GENRE_ORDER[0]} />)
    expect(screen.getByText(GENRE_LABELS[GENRE_ORDER[0]])).toBeTruthy()
    expect(screen.queryByText(/影響度/)).toBeNull()
  })

  it('影響度が「影響度 大」のように文字で分かるバッジで表示されること', () => {
    render(<FindingBadges genre={GENRE_ORDER[0]} impact="high" />)
    expect(screen.getByText('影響度 大')).toBeTruthy()
  })

  // 仕様: specs/research-digest/content-selection/requirements.md#採用基準-3
  it('査読前の論文のときだけ「査読前」のバッジが表示されること', () => {
    const { rerender } = render(<FindingBadges genre={GENRE_ORDER[0]} impact="low" isPreprint={true} />)
    expect(screen.getByText('査読前')).toBeTruthy()
    rerender(<FindingBadges genre={GENRE_ORDER[0]} impact="low" isPreprint={false} />)
    expect(screen.queryByText('査読前')).toBeNull()
  })
})
