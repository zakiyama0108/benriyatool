import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import HelpIcon from '../../../app/life-money-sim/components/HelpIcon'

// 仕様: specs/life-money-sim/usage-guide/requirements.md#コンテキストヘルプ(？アイコン)-2
describe('「？」アイコンのクリックでポップオーバーの開閉を要求する - 開閉状態自体は呼び出し元(openId)が持つ', () => {
  it('「？」を押すと、自身のidを引数にonToggleが呼ばれること', () => {
    const onToggle = vi.fn()
    render(<HelpIcon id="income" text="収入の説明" openId={null} onToggle={onToggle} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'ヘルプ' }))
    expect(onToggle).toHaveBeenCalledWith('income')
  })

  it('openIdが自身のidと一致するとき、説明文言のポップオーバーが表示されること', () => {
    render(<HelpIcon id="income" text="収入の説明" openId="income" onToggle={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('収入の説明')).toBeTruthy()
  })

  it('openIdがnull(何も開いていない)のとき、ポップオーバーは表示されないこと', () => {
    render(<HelpIcon id="income" text="収入の説明" openId={null} onToggle={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByText('収入の説明')).toBeNull()
  })

  it('openIdが別カードのidのとき、自身のポップオーバーは表示されないこと', () => {
    render(<HelpIcon id="income" text="収入の説明" openId="personalExpense" onToggle={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByText('収入の説明')).toBeNull()
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#コンテキストヘルプ(？アイコン)-2
describe('ポップオーバー外側のクリックによるクローズ', () => {
  it('ポップオーバー表示中に外側をクリックするとonCloseが呼ばれること', () => {
    const onClose = vi.fn()
    render(
      <div>
        <div data-outside>外側</div>
        <HelpIcon id="income" text="収入の説明" openId="income" onToggle={vi.fn()} onClose={onClose} />
      </div>
    )
    fireEvent.mouseDown(screen.getByText('外側'))
    expect(onClose).toHaveBeenCalled()
  })

  it('ポップオーバー自身の内側(説明文言)をクリックしてもonCloseが呼ばれないこと', () => {
    const onClose = vi.fn()
    render(<HelpIcon id="income" text="収入の説明" openId="income" onToggle={vi.fn()} onClose={onClose} />)
    fireEvent.mouseDown(screen.getByText('収入の説明'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('ポップオーバーが閉じているとき、外側をクリックしてもonCloseが呼ばれないこと(不要な呼び出しをしない)', () => {
    const onClose = vi.fn()
    render(
      <div>
        <div data-outside>外側</div>
        <HelpIcon id="income" text="収入の説明" openId={null} onToggle={vi.fn()} onClose={onClose} />
      </div>
    )
    fireEvent.mouseDown(screen.getByText('外側'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

// 呼び出し元(page.tsx)が担う「openHelpIdを1つだけ保持し、クリックしたカードのIDに置き換える」制御を
// 小さなテスト用ラッパーで再現し、要件どおり同時に1つしか開かないことを検証する
// (仕様: specs/life-money-sim/usage-guide/requirements.md#コンテキストヘルプ(？アイコン)-3、design.md#コンテキストヘルプの開閉を制御する処理)
function TwoCardsWrapper() {
  const [openHelpId, setOpenHelpId] = useState<string | null>(null)
  function toggleHelp(id: string) {
    setOpenHelpId((current) => (current === id ? null : id))
  }
  return (
    <div>
      <HelpIcon id="income" text="収入の説明" openId={openHelpId} onToggle={toggleHelp} onClose={() => setOpenHelpId(null)} />
      <HelpIcon
        id="personalExpense"
        text="個人支出の説明"
        openId={openHelpId}
        onToggle={toggleHelp}
        onClose={() => setOpenHelpId(null)}
      />
    </div>
  )
}

// 仕様: specs/life-money-sim/usage-guide/requirements.md#コンテキストヘルプ(？アイコン)-3
describe('同時に開けるポップオーバーは1つまで', () => {
  it('片方のカードの「？」を開いた状態で別カードの「？」を押すと、前者が閉じ後者が開くこと', () => {
    render(<TwoCardsWrapper />)
    const buttons = screen.getAllByRole('button', { name: 'ヘルプ' })

    fireEvent.click(buttons[0])
    expect(screen.getByText('収入の説明')).toBeTruthy()
    expect(screen.queryByText('個人支出の説明')).toBeNull()

    fireEvent.click(buttons[1])
    expect(screen.queryByText('収入の説明')).toBeNull()
    expect(screen.getByText('個人支出の説明')).toBeTruthy()
  })

  it('開いているカードの「？」をもう一度押すと閉じること', () => {
    render(<TwoCardsWrapper />)
    const buttons = screen.getAllByRole('button', { name: 'ヘルプ' })

    fireEvent.click(buttons[0])
    expect(screen.getByText('収入の説明')).toBeTruthy()

    fireEvent.click(buttons[0])
    expect(screen.queryByText('収入の説明')).toBeNull()
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#コンテキストヘルプ(？アイコン)-4
describe('説明文言の表示 - ポップオーバーにはtextプロップの説明文言がそのまま表示される', () => {
  it('カードごとに異なる説明文言(textプロップ)がそのまま表示されること', () => {
    render(<HelpIcon id="assetProjection" text="資産推移グラフ・テーブルの説明" openId="assetProjection" onToggle={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('資産推移グラフ・テーブルの説明')).toBeTruthy()
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#コンテキストヘルプ(？アイコン)-1
describe('「？」アイコンの視認性 - マウスが重なっていないノーマル時も円の輪郭が視認できること', () => {
  it('ノーマル時のボーダー色が薄すぎるlms-lineではなく、視認性の高いlms-mutedであること', () => {
    render(<HelpIcon id="income" text="収入の説明" openId={null} onToggle={vi.fn()} onClose={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'ヘルプ' })
    expect(button.className).toContain('border-lms-muted')
    expect(button.className).not.toContain('border-lms-line ')
  })
})
