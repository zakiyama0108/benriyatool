import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page, { metadata } from '../../../app/ikukyu/guide/hayamihyo/page'
import { calcMonthlyBenefit } from '../../../app/ikukyu/guide/lib/monthlyBenefit'

// 早見表の対象: 月給20万〜60万円を5万円刻みの9段階
const SALARY_BANDS = [200000, 250000, 300000, 350000, 400000, 450000, 500000, 550000, 600000]

// 仕様: specs/ikukyu/guide/requirements.md#記事2: 月給別・育休給付金早見表(`/ikukyu/guide/hayamihyo/`)-1
describe('記事2「早見表」の一覧表 - 月給9段階×3つの給付率の月額が計算エンジンの出力と一致する', () => {
  it('月給20万〜60万円の全9段階で、「最初の180日(67%)」「181日以降(50%)」「上乗せ時(80%)」の月額が計算関数と一致すること', () => {
    render(<Page />)
    for (const salary of SALARY_BANDS) {
      const expected = calcMonthlyBenefit(salary)
      expect(screen.getAllByText(`${expected.month67.toLocaleString()}円`).length).toBeGreaterThan(0)
      expect(screen.getAllByText(`${expected.month50.toLocaleString()}円`).length).toBeGreaterThan(0)
      expect(screen.getAllByText(`${expected.month80.toLocaleString()}円`).length).toBeGreaterThan(0)
    }
  })

  it('賃金日額の上限を超える月給帯(50万円以上)に「上限適用」の表示があること', () => {
    render(<Page />)
    expect(screen.getAllByText('上限適用').length).toBeGreaterThan(0)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事2: 月給別・育休給付金早見表(`/ikukyu/guide/hayamihyo/`)-3
describe('記事2の目次 - 月給帯ごとのアンカーリンクで将来の記事分割に備える', () => {
  it('目次の各リンクが、対応する月給帯セクションのアンカー(id)と一致すること', () => {
    const { container } = render(<Page />)
    for (const salary of SALARY_BANDS) {
      const anchor = `salary-${salary / 10000}`
      const tocLink = container.querySelector(`a[href="#${anchor}"]`)
      const section = container.querySelector(`[id="${anchor}"]`)
      expect(tocLink, `目次リンク #${anchor} がない`).toBeTruthy()
      expect(section, `セクション id=${anchor} がない`).toBeTruthy()
    }
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事2: 月給別・育休給付金早見表(`/ikukyu/guide/hayamihyo/`)-2
describe('記事2の手取り感覚の補足 - 社会保険料免除・住民税の扱いを短く添える', () => {
  it('社会保険料の免除と、住民税は前年所得分の支払いが残ることが本文に記載されること', () => {
    render(<Page />)
    expect(screen.getAllByText(/社会保険料/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/住民税/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/前年/).length).toBeGreaterThan(0)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事2: 月給別・育休給付金早見表(`/ikukyu/guide/hayamihyo/`)-4
describe('記事2のシミュレーター導線 - 冒頭と末尾の2か所にCTAを置く', () => {
  it('シミュレーター(/ikukyu)への内部リンクCTAが2つ以上あること', () => {
    render(<Page />)
    const ctas = screen.getAllByRole('link', { name: /計算/ }).filter((link) => link.getAttribute('href') === '/ikukyu')
    expect(ctas.length).toBeGreaterThanOrEqual(2)
  })

  it('タイトルタグに「早見表」が含まれること', () => {
    expect(metadata.title as string).toContain('早見表')
  })
})
