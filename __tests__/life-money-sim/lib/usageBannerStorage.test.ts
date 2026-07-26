import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadUsageBannerOpen, saveUsageBannerOpen } from '../../../app/life-money-sim/lib/usageBannerStorage'

describe('使い方バナーの開閉状態の読み込み', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  // 仕様: specs/life-money-sim/usage-guide/requirements.md#使い方バナー-2
  it('保存値が無い(初回訪問)場合、開いた状態(true)を返すこと', () => {
    expect(loadUsageBannerOpen()).toBe(true)
  })

  it('保存値がfalse(閉じた状態)の場合、falseを返すこと', () => {
    saveUsageBannerOpen(false)
    expect(loadUsageBannerOpen()).toBe(false)
  })

  it('保存値がtrue(開いた状態)の場合、trueを返すこと', () => {
    saveUsageBannerOpen(true)
    expect(loadUsageBannerOpen()).toBe(true)
  })

  // 仕様: specs/life-money-sim/usage-guide/requirements.md#保存できない環境でのフォールバック-1、specs/life-money-sim/usage-guide/design.md#エラーハンドリング
  it('プライベートブラウジング等でlocalStorage.getItemが例外を投げる場合、開いた状態(true)にフォールバックしエラーを投げないこと', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => loadUsageBannerOpen()).not.toThrow()
    expect(loadUsageBannerOpen()).toBe(true)
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#使い方バナー-5
describe('使い方バナーの開閉状態の保存', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('開閉状態を保存すると、次回のloadUsageBannerOpenで同じ値が読み込めること', () => {
    saveUsageBannerOpen(false)
    expect(loadUsageBannerOpen()).toBe(false)
    saveUsageBannerOpen(true)
    expect(loadUsageBannerOpen()).toBe(true)
  })

  // 仕様: specs/life-money-sim/usage-guide/requirements.md#保存できない環境でのフォールバック-1、specs/life-money-sim/usage-guide/design.md#エラーハンドリング、specs/life-money-sim/usage-guide/design.md#ログ
  it('プライベートブラウジング等でlocalStorage.setItemが例外を投げる場合、エラーを外に投げず、console.errorでログのみ出すこと', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => saveUsageBannerOpen(false)).not.toThrow()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})

// 仕様: specs/life-money-sim/usage-guide/design.md#ログ
describe('使い方バナーの開閉状態の読み込み失敗時のログ', () => {
  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('localStorage.getItemが例外を投げた場合、console.errorでログを出すこと', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    loadUsageBannerOpen()
    expect(consoleErrorSpy).toHaveBeenCalled()
  })
})
