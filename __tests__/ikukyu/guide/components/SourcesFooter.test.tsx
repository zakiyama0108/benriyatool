import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SourcesFooter from '../../../../app/ikukyu/guide/components/SourcesFooter'

const sources = [
  { label: '厚生労働省「出生後休業支援給付金」', href: 'https://www.mhlw.go.jp/example' },
]

// 仕様: specs/ikukyu/guide/requirements.md#記事ページ共通-7、specs/ikukyu/guide/requirements.md#YMYL・正確性の担保-1、specs/ikukyu/guide/requirements.md#YMYL・正確性の担保-2
describe('ガイド記事の参考資料フッター - 一次資料リンク・最終更新日・免責・制度定数の適用期間を明記する(YMYL対策)', () => {
  it('一次資料への外部リンクが安全な属性(rel)付きで表示されること', () => {
    render(<SourcesFooter sources={sources} lastUpdated="2026年7月18日" appliedPeriod="2025年8月1日〜2026年7月31日" />)
    const link = screen.getByRole('link', { name: /厚生労働省/ })
    expect(link.getAttribute('href')).toBe('https://www.mhlw.go.jp/example')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('最終更新日と制度定数の適用期間が表示されること', () => {
    render(<SourcesFooter sources={sources} lastUpdated="2026年7月18日" appliedPeriod="2025年8月1日〜2026年7月31日" />)
    expect(screen.getByText(/最終更新日: 2026年7月18日/)).toBeTruthy()
    expect(screen.getByText(/2025年8月1日〜2026年7月31日/)).toBeTruthy()
  })

  it('「実際の支給額は勤務先・ハローワーク等で確認」の免責注記が表示されること', () => {
    render(<SourcesFooter sources={sources} lastUpdated="2026年7月18日" appliedPeriod="2025年8月1日〜2026年7月31日" />)
    expect(screen.getByText(/勤務先やハローワーク/)).toBeTruthy()
  })
})
