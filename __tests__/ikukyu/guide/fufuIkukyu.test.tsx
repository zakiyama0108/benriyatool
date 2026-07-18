import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page, { metadata } from '../../../app/ikukyu/guide/fufu-ikukyu/page'
import { comparePatterns, simulateHousehold } from '../../../app/ikukyu/guide/lib/householdSimulation'

// 仕様: specs/ikukyu/guide/requirements.md#記事3: 夫婦育休の世帯収入シミュレーション(`/ikukyu/guide/fufu-ikukyu/`)-1
describe('記事3「夫婦育休」の月次推移表 - 3パターンの世帯収入がシミュレーション結果と一致する', () => {
  it('パターンA・B・Cの各月の世帯収入合計が、すべて表に表示されること', () => {
    render(<Page />)
    for (const pattern of ['A', 'B', 'C'] as const) {
      for (const row of simulateHousehold(pattern).rows) {
        expect(
          screen.getAllByText(`${row.total.toLocaleString()}円`).length,
          `${pattern} ${row.month} の金額がない`,
        ).toBeGreaterThan(0)
      }
    }
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事3: 夫婦育休の世帯収入シミュレーション(`/ikukyu/guide/fufu-ikukyu/`)-2
describe('記事3の差額まとめ - パターン間の世帯収入差額を実額で明示する', () => {
  it('3パターンの累計と、パターンAとの差額が本文に表示されること', () => {
    render(<Page />)
    const { totals, diffFromA } = comparePatterns()
    for (const pattern of ['A', 'B', 'C'] as const) {
      expect(screen.getAllByText(new RegExp(totals[pattern].toLocaleString())).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByText(new RegExp(`\\+${diffFromA.B.toLocaleString()}`)).length).toBeGreaterThan(0)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事3: 夫婦育休の世帯収入シミュレーション(`/ikukyu/guide/fufu-ikukyu/`)-3
describe('記事3の前提条件の明記 - 試算の前提を本文に示す(YMYL対策)', () => {
  it('ボーナス除外・手取り概算・発生月ベースの日割り・振込は後払い、の前提が本文に記載されること', () => {
    render(<Page />)
    expect(screen.getAllByText(/ボーナス|賞与/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/概算/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/日割り/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/後払い/).length).toBeGreaterThan(0)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事3: 夫婦育休の世帯収入シミュレーション(`/ikukyu/guide/fufu-ikukyu/`)-4
describe('記事3のシミュレーター導線 - 「自分の世帯で試す」導線を作る', () => {
  it('シミュレーター(/ikukyu)への内部リンクが表示されること', () => {
    render(<Page />)
    const ctas = screen.getAllByRole('link', { name: /自分の/ }).filter((link) => link.getAttribute('href') === '/ikukyu')
    expect(ctas.length).toBeGreaterThan(0)
  })

  it('タイトルタグに「夫婦」が含まれること', () => {
    expect(metadata.title as string).toContain('夫婦')
  })
})
