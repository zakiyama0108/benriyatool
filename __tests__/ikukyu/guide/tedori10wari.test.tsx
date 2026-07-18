import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Page, { metadata } from '../../../app/ikukyu/guide/tedori-10wari/page'
import { calcMonthlyBenefit, findCapSalaryLine } from '../../../app/ikukyu/guide/lib/monthlyBenefit'

// 仕様: specs/ikukyu/guide/requirements.md#記事1: 手取り10割検証(`/ikukyu/guide/tedori-10wari/`)-2、specs/ikukyu/guide/requirements.md#数値の算出元-2、specs/ikukyu/guide/requirements.md#数値の算出元-1
describe('記事1「手取り10割検証」の実額表 - 月給5ケースの給付額が計算エンジンの出力と一致する', () => {
  it('月給20万〜50万円の5ケースすべてで、表の「通常の給付(67%)」「上乗せ後(80%)」が計算関数の月額と一致すること', () => {
    render(<Page />)
    for (const salary of [200000, 250000, 300000, 400000, 500000]) {
      const expected = calcMonthlyBenefit(salary)
      // 同額が複数セルに現れる場合もあるため getAllByText で存在を確認する
      expect(screen.getAllByText(`${expected.month67.toLocaleString()}円`).length).toBeGreaterThan(0)
      expect(screen.getAllByText(`${expected.month80.toLocaleString()}円`).length).toBeGreaterThan(0)
    }
  })

  it('上限適用となる月給50万円の行に「上限適用」バッジが表示されること', () => {
    render(<Page />)
    expect(screen.getAllByText('上限適用').length).toBeGreaterThan(0)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事1: 手取り10割検証(`/ikukyu/guide/tedori-10wari/`)-3
describe('記事1の独自価値 - 手取り10割にならない月給ラインを本文で明示する', () => {
  it('探索で導出した上限適用ラインの月給額が、記事本文に表示されること', () => {
    render(<Page />)
    const { capSalary } = findCapSalaryLine()
    expect(screen.getAllByText(new RegExp(capSalary.toLocaleString())).length).toBeGreaterThan(0)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事1: 手取り10割検証(`/ikukyu/guide/tedori-10wari/`)-1、specs/ikukyu/guide/requirements.md#記事1: 手取り10割検証(`/ikukyu/guide/tedori-10wari/`)-4、specs/ikukyu/guide/requirements.md#記事ページ共通-6
describe('記事1の構成 - 冒頭の制度要点とシミュレーターへの導線', () => {
  it('冒頭に「夫婦それぞれ14日以上」「最大28日」「80%」という制度の要点が含まれること', () => {
    render(<Page />)
    expect(screen.getAllByText(/14日以上/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/最大28日/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/80%/).length).toBeGreaterThan(0)
  })

  it('「あなたの条件で正確に計算する」のCTAがシミュレーター(/ikukyu)への内部リンクとして表示されること', () => {
    render(<Page />)
    const ctas = screen.getAllByRole('link', { name: /あなたの条件で正確に計算する/ })
    expect(ctas.length).toBeGreaterThan(0)
    expect(ctas[0].getAttribute('href')).toBe('/ikukyu')
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#手取り比較の扱い-3
describe('記事1の手取り比較の前提明記 - 概算であることと計算前提を本文に示す', () => {
  it('就労時の手取りが「額面の約8割」の概算である前提が本文に明記されること', () => {
    render(<Page />)
    expect(screen.getAllByText(/額面の(約)?8割/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/概算/).length).toBeGreaterThan(0)
  })
})

// 仕様: specs/ikukyu/guide/requirements.md#記事ページ共通-4
describe('記事1のメタデータ - タイトルタグ・meta description・OGPを設定する', () => {
  it('タイトルに「手取り10割」、descriptionに狙うキーワードの説明が含まれ、OGPが設定されていること', () => {
    expect(String(metadata.title)).toContain('手取り10割')
    expect(String(metadata.description)).toContain('出生後休業支援給付金')
    expect(metadata.openGraph?.url).toBe('/ikukyu/guide/tedori-10wari')
  })
})
