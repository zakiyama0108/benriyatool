import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ScenarioLoginPrompt from '../../../app/life-money-sim/components/ScenarioLoginPrompt'

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#マイシナリオの表示-2
describe('未ログイン時のマイシナリオ案内 - 「この試算を実行する」の近くにログイン誘導を表示する', () => {
  it('賞与・イベントの名目や生年月も含めて保存・復元できる旨の案内文言が表示されること', () => {
    render(<ScenarioLoginPrompt onLoginClick={vi.fn()} />)
    expect(screen.getByText(/賞与・イベントの名目や生年月/)).toBeTruthy()
  })

  it('ログインボタンが表示され、押すとログイン開始(onLoginClick)が呼ばれること', () => {
    const onLoginClick = vi.fn()
    render(<ScenarioLoginPrompt onLoginClick={onLoginClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Googleでログイン' }))
    expect(onLoginClick).toHaveBeenCalled()
  })
})

// 仕様: specs/life-money-sim/saved-scenario/requirements.md#マイシナリオの表示-2、specs/life-money-sim/save-result/requirements.md#機能要件-3
describe('未ログイン時のマイシナリオ案内 - 参照するボタン名を変更後の文言に合わせる', () => {
  it('案内文言中で参照するボタン名が「この試算を実行する」に更新されていること(旧文言「この試算を保存する」は含まない)', () => {
    render(<ScenarioLoginPrompt onLoginClick={vi.fn()} />)
    expect(screen.getByText(/この試算を実行する/)).toBeTruthy()
  })
})
