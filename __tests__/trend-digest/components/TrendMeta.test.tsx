import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import TrendMeta from '../../../app/trend-digest/components/TrendMeta'
import type { TopicTrend } from '../../../app/trend-digest/lib/types'

function makeTrend(overrides: Partial<TopicTrend> = {}): TopicTrend {
  return {
    durationLabel: 'talked',
    heatLabel: 'high',
    continuationDays: 30,
    continuationStartDate: '2026-08-16',
    reportCount: 1,
    originRegion: null,
    currentRegions: [],
    ...overrides,
  }
}

// 仕様: specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-14、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-15、specs/trend-digest/article-detail/requirements.md#継続度・注目度の表示-16
describe('トレンド情報の行 - 継続期間・報告回数・地域を1行で表示し、不明な項目は項目ごと省く', () => {
  it('継続開始日と継続日数から継続期間が表示されること', () => {
    render(<TrendMeta trend={makeTrend({ continuationStartDate: '2026-08-16', continuationDays: 30 })} />)
    expect(screen.getByText(/8月16日/)).toBeTruthy()
    expect(screen.getByText(/30日/)).toBeTruthy()
  })

  it('reportCountが1(初掲載)のとき、報告回数が表示されないこと', () => {
    render(<TrendMeta trend={makeTrend({ reportCount: 1 })} />)
    expect(screen.queryByText(/回目の報告/)).toBeNull()
  })

  it('reportCountが2以上のとき、通算の報告回数が表示されること', () => {
    render(<TrendMeta trend={makeTrend({ reportCount: 3 })} />)
    expect(screen.getByText(/3回目の報告/)).toBeTruthy()
  })

  it('originRegionがnullのとき、発祥地域の項目が表示されないこと(「不明」という文字列も出さない)', () => {
    render(<TrendMeta trend={makeTrend({ originRegion: null })} />)
    expect(screen.queryByText(/発祥/)).toBeNull()
    expect(screen.queryByText('不明')).toBeNull()
  })

  it('originRegionが判定できている場合、発祥地域が表示されること', () => {
    render(<TrendMeta trend={makeTrend({ originRegion: '日本' })} />)
    expect(screen.getByText(/発祥.*日本/)).toBeTruthy()
  })

  it('currentRegionsが空配列のとき、主な流行地域の項目が表示されないこと', () => {
    render(<TrendMeta trend={makeTrend({ currentRegions: [] })} />)
    expect(screen.queryByText(/主な流行地域/)).toBeNull()
  })

  it('currentRegionsが判定できている場合、主な流行地域が表示されること', () => {
    render(<TrendMeta trend={makeTrend({ currentRegions: ['日本', '北米'] })} />)
    expect(screen.getByText(/主な流行地域.*日本.*北米/)).toBeTruthy()
  })
})
