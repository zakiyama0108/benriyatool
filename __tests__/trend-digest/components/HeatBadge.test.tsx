import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HeatBadge from '../../../app/trend-digest/components/HeatBadge'
import { HEAT_LABELS } from '../../../app/trend-digest/lib/types'
import type { HeatLabel } from '../../../app/trend-digest/lib/historyTypes'

// 仕様: specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-12、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-13
describe('注目度ラベルのバッジ - 今どれくらい強いかを日本語ラベル付きで表示する', () => {
  it.each(Object.keys(HEAT_LABELS) as HeatLabel[])('%sのとき、HEAT_LABELSの日本語表記が表示されること', (label) => {
    render(<HeatBadge label={label} />)
    expect(screen.getByText(HEAT_LABELS[label])).toBeTruthy()
  })
})
