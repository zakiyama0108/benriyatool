import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import GlossaryButton from '../../../app/life-money-sim/components/GlossaryButton'
import { GLOSSARY_TERMS } from '../../../app/life-money-sim/lib/usageGuideContent'

// 仕様: specs/life-money-sim/usage-guide/requirements.md#用語集-2
describe('「用語集」ボタンによるモーダルの開閉', () => {
  it('初期状態ではモーダルは表示されていないこと', () => {
    render(<GlossaryButton />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('「用語集」ボタンを押すとモーダルが開くこと', () => {
    render(<GlossaryButton />)
    fireEvent.click(screen.getByRole('button', { name: '用語集' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#用語集-3
describe('用語一覧の表示 - GLOSSARY_TERMSの4用語とその説明を一覧表示する', () => {
  it('モーダルを開くと、4つの用語すべてとその説明文言が表示されること', () => {
    render(<GlossaryButton />)
    fireEvent.click(screen.getByRole('button', { name: '用語集' }))
    for (const entry of GLOSSARY_TERMS) {
      expect(screen.getByText(entry.term)).toBeTruthy()
      expect(screen.getByText(entry.text)).toBeTruthy()
    }
  })
})

// 仕様: specs/life-money-sim/usage-guide/requirements.md#用語集-4
describe('モーダルを閉じる操作', () => {
  it('閉じるボタンを押すとモーダルが閉じること', () => {
    render(<GlossaryButton />)
    fireEvent.click(screen.getByRole('button', { name: '用語集' }))
    fireEvent.click(screen.getByRole('button', { name: '閉じる' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('モーダル外側(背景オーバーレイ)をクリックすると閉じること', () => {
    render(<GlossaryButton />)
    fireEvent.click(screen.getByRole('button', { name: '用語集' }))
    // モーダル本体(dialog)を包む背景オーバーレイをクリックする(オーバーレイ自体は装飾要素で
    // アクセシブルロールを持たないため、dialogの親要素として取得する)
    const overlay = screen.getByRole('dialog').parentElement
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay!)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('モーダル内側(用語の説明文言)をクリックしても閉じないこと', () => {
    render(<GlossaryButton />)
    fireEvent.click(screen.getByRole('button', { name: '用語集' }))
    fireEvent.click(screen.getByText(GLOSSARY_TERMS[0].term))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})
