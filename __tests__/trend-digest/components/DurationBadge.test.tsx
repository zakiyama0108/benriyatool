import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import DurationBadge from '../../../app/trend-digest/components/DurationBadge'
import { DURATION_LABELS } from '../../../app/trend-digest/lib/types'
import type { DurationLabel } from '../../../app/trend-digest/lib/historyTypes'

// 仕様: specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-10、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-13
describe('継続度ラベルのバッジ - どれだけ続いているかを日本語ラベル付きで表示する', () => {
  it.each(Object.keys(DURATION_LABELS) as DurationLabel[])(
    '%sのとき、DURATION_LABELSの日本語表記が表示されること',
    (label) => {
      render(<DurationBadge label={label} />)
      expect(screen.getByText(DURATION_LABELS[label], { exact: false })).toBeTruthy()
    }
  )
})

// 仕様: specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-11
describe('「流行前」の継続度ラベルの表記 - 半月以上続いている話題という目安にまだ達していないことが分かる文言にする', () => {
  it('durationLabelが"pre-trend"のとき、半月に満たないことが分かる補足文言が表示されること', () => {
    render(<DurationBadge label="pre-trend" />)
    expect(screen.getByText(/半月/)).toBeTruthy()
  })

  it('durationLabelが"emerging"(半月以上)のときは、半月に満たないことを示す補足文言が表示されないこと', () => {
    render(<DurationBadge label="emerging" />)
    expect(screen.queryByText(/半月/)).toBeNull()
  })
})
