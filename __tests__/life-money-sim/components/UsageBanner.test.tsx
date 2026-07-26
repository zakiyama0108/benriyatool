import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import UsageBanner from '../../../app/life-money-sim/components/UsageBanner'
import { USAGE_BANNER_STEPS } from '../../../app/life-money-sim/lib/usageGuideContent'
import { loadUsageBannerOpen, saveUsageBannerOpen } from '../../../app/life-money-sim/lib/usageBannerStorage'

afterEach(() => {
  localStorage.clear()
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#使い方バナー-2
describe('使い方バナーの初回表示 - 保存済みの開閉状態が無い場合は開いた状態から始まる', () => {
  it('保存値が無い(初回訪問)とき、開いた状態で3ステップの操作ガイドが表示されること', () => {
    render(<UsageBanner />)
    for (const step of USAGE_BANNER_STEPS) {
      expect(screen.getByText(step.title)).toBeTruthy()
      expect(screen.getByText(step.text)).toBeTruthy()
    }
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#使い方バナー-3
describe('3ステップの文言表示 - USAGE_BANNER_STEPSの内容を順番どおり表示する', () => {
  it('①→②→③の順番どおりにステップのタイトルが表示されること', () => {
    render(<UsageBanner />)
    const titles = screen.getAllByText(/^①|^②|^③/).map((el) => el.textContent)
    expect(titles).toEqual(USAGE_BANNER_STEPS.map((s) => s.title))
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#使い方バナー-4
describe('バナーのクリックによる開閉', () => {
  it('開いた状態でバナーの見出しをクリックすると、3ステップの操作ガイドが隠れること', () => {
    render(<UsageBanner />)
    fireEvent.click(screen.getByRole('button', { name: /使い方/ }))
    expect(screen.queryByText(USAGE_BANNER_STEPS[0].title)).toBeNull()
  })

  it('閉じた状態から再度クリックすると、3ステップの操作ガイドが再び表示されること', () => {
    render(<UsageBanner />)
    const toggle = screen.getByRole('button', { name: /使い方/ })
    fireEvent.click(toggle)
    fireEvent.click(toggle)
    expect(screen.getByText(USAGE_BANNER_STEPS[0].title)).toBeTruthy()
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#使い方バナー-5
describe('開閉状態のブラウザ保存 - 次回訪問時も直前の開閉状態を維持する', () => {
  it('前回訪問時に閉じて保存していた場合、マウント後に閉じた状態で表示されること', () => {
    saveUsageBannerOpen(false)
    render(<UsageBanner />)
    expect(screen.queryByText(USAGE_BANNER_STEPS[0].title)).toBeNull()
  })

  it('前回訪問時に開いて保存していた場合、開いた状態で表示されること', () => {
    saveUsageBannerOpen(true)
    render(<UsageBanner />)
    expect(screen.getByText(USAGE_BANNER_STEPS[0].title)).toBeTruthy()
  })

  it('クリックして閉じると、閉じた状態がブラウザに保存され、次回のloadUsageBannerOpenでも反映されること', () => {
    render(<UsageBanner />)
    fireEvent.click(screen.getByRole('button', { name: /使い方/ }))
    expect(loadUsageBannerOpen()).toBe(false)
  })

  it('閉じた状態から開くと、開いた状態がブラウザに保存されること', () => {
    saveUsageBannerOpen(false)
    render(<UsageBanner />)
    fireEvent.click(screen.getByRole('button', { name: /使い方/ }))
    expect(loadUsageBannerOpen()).toBe(true)
  })
})
