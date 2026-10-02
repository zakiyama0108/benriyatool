import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SlotBadges from '../../../app/future-digest/components/SlotBadges'
import { GENRE_ORDER, GENRE_LABELS } from '../../../app/future-digest/lib/types'

// 仕様: specs/future-digest/article-detail/requirements.md#記事本文の表示-2
describe('ジャンル・時間軸・影響度のバッジ表示 - 日本語ラベルのバッジで表示する', () => {
  it('ジャンル・時間軸のラベルが表示されること', () => {
    render(<SlotBadges genre={GENRE_ORDER[0]} horizon="near" />)
    expect(screen.getByText(GENRE_LABELS[GENRE_ORDER[0]])).toBeTruthy()
    expect(screen.getByText('近未来')).toBeTruthy()
  })

  it('impactを指定した場合、「影響度 大」のように文字で影響度が分かるバッジが表示されること', () => {
    render(<SlotBadges genre={GENRE_ORDER[0]} horizon="near" impact="high" />)
    expect(screen.getByText('影響度 大')).toBeTruthy()
  })

  it('impactを指定しない場合、影響度バッジが表示されないこと', () => {
    render(<SlotBadges genre={GENRE_ORDER[0]} horizon="near" />)
    expect(screen.queryByText(/影響度/)).toBeNull()
  })
})
